import java.util.ArrayList;
import java.util.List;

/**
 * The simulator: it owns the robot's state and applies each command to it.
 * It records a "frame" after every command so the run can be replayed in the viewer.
 *
 * You do not need to edit this file. You can read it to see exactly how each command works.
 */
public final class Sim {
    public static final String[] DIRS = {"N", "E", "S", "W"};
    private static final int[] DX = {0, 1, 0, -1};
    private static final int[] DY = {-1, 0, 1, 0};

    /** A snapshot of the world after one command. */
    public static class Frame {
        String cmd;
        boolean ok;
        String note;
        int x;
        int y;
        String dir;
        boolean carrying;
        List<int[]> cargo;
        int score;
    }

    private final Field field;
    private int x;
    private int y;
    private int dir = 1;                     // 0 N, 1 E, 2 S, 3 W. The robot starts facing East.
    private boolean carrying = false;
    private final List<int[]> cargo;         // cargo lying on the floor (not the one being carried)
    private int used = 0;
    private boolean closed = false;
    private final List<Frame> frames = new ArrayList<Frame>();
    private String error = null;

    public Sim(Field field) {
        this.field = field;
        this.x = field.startX();
        this.y = field.startY();
        this.cargo = field.startCargo();
        record("start", true, "The robot is on the starting tile, facing East.");
    }

    // ---------- commands ----------

    public synchronized void forward() {
        begin();
        int nx = x + DX[dir];
        int ny = y + DY[dir];
        if (field.isWall(nx, ny)) {
            record("forward", false, "Bumped into a wall. The command was wasted.");
        } else {
            x = nx;
            y = ny;
            record("forward", true, "Moved " + DIRS[dir] + " to (" + x + ", " + y + ").");
        }
    }

    public synchronized void turnLeft() {
        begin();
        dir = (dir + 3) % 4;
        record("turnLeft", true, "Turned left. Now facing " + DIRS[dir] + ".");
    }

    public synchronized void turnRight() {
        begin();
        dir = (dir + 1) % 4;
        record("turnRight", true, "Turned right. Now facing " + DIRS[dir] + ".");
    }

    public synchronized void grab() {
        begin();
        if (carrying) {
            record("grab", false, "Already carrying cargo. The robot can hold only one piece.");
            return;
        }
        int i = cargoIndex(x, y);
        if (i < 0) {
            record("grab", false, "Nothing to grab on this tile.");
            return;
        }
        cargo.remove(i);
        carrying = true;
        record("grab", true, "Picked up the cargo at (" + x + ", " + y + ").");
    }

    public synchronized void release() {
        begin();
        if (!carrying) {
            record("release", false, "The robot is not carrying anything.");
            return;
        }
        if (cargoIndex(x, y) >= 0) {
            record("release", false, "There is already cargo on this tile. Only one piece fits per tile.");
            return;
        }
        cargo.add(new int[] {x, y});
        carrying = false;
        record("release", true, "Put the cargo down at (" + x + ", " + y + ").");
    }

    // ---------- sensors (these cost nothing) ----------

    public synchronized int x() {
        return x;
    }

    public synchronized int y() {
        return y;
    }

    public synchronized char heading() {
        return DIRS[dir].charAt(0);
    }

    public synchronized boolean wallAhead() {
        return field.isWall(x + DX[dir], y + DY[dir]);
    }

    public synchronized boolean hasCargo() {
        return carrying;
    }

    public synchronized boolean cargoAt(int cx, int cy) {
        return cargoIndex(cx, cy) >= 0;
    }

    public synchronized int commandsLeft() {
        return Rules.MAX_COMMANDS - used;
    }

    public synchronized int score() {
        return computeScore();
    }

    public Field field() {
        return field;
    }

    // ---------- bookkeeping ----------

    private void begin() {
        if (closed || used >= Rules.MAX_COMMANDS) {
            throw new OutOfCommands();
        }
        used++;
    }

    private int cargoIndex(int cx, int cy) {
        for (int i = 0; i < cargo.size(); i++) {
            if (cargo.get(i)[0] == cx && cargo.get(i)[1] == cy) {
                return i;
            }
        }
        return -1;
    }

    private int computeScore() {
        return lowCount() * Rules.POINTS_LOW + highCount() * Rules.POINTS_HIGH + (parked() ? Rules.POINTS_PARK : 0);
    }

    public synchronized int lowCount() {
        return countOn('Z');
    }

    public synchronized int highCount() {
        return countOn('H');
    }

    public synchronized boolean parked() {
        return field.at(x, y) == 'P';
    }

    private int countOn(char tile) {
        int n = 0;
        for (int[] c : cargo) {
            if (field.at(c[0], c[1]) == tile) {
                n++;
            }
        }
        return n;
    }

    private void record(String cmd, boolean ok, String note) {
        Frame f = new Frame();
        f.cmd = cmd;
        f.ok = ok;
        f.note = note;
        f.x = x;
        f.y = y;
        f.dir = DIRS[dir];
        f.carrying = carrying;
        f.cargo = new ArrayList<int[]>();
        for (int[] c : cargo) {
            f.cargo.add(new int[] {c[0], c[1]});
        }
        f.score = computeScore();
        frames.add(f);
    }

    /** Stop accepting commands. Used when a strategy runs too long. */
    public synchronized void close() {
        closed = true;
    }

    public synchronized void setError(String message) {
        if (error == null) {
            error = message;
        }
    }

    public synchronized String error() {
        return error;
    }

    public synchronized int used() {
        return used;
    }

    public synchronized List<Frame> frames() {
        return new ArrayList<Frame>(frames);
    }

    public synchronized List<int[]> cargoNow() {
        List<int[]> copy = new ArrayList<int[]>();
        for (int[] c : cargo) {
            copy.add(new int[] {c[0], c[1]});
        }
        return copy;
    }

    public synchronized int dirIndex() {
        return dir;
    }
}
