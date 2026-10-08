import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * The playing field: a grid of tiles loaded from field.txt.
 *
 * Coordinates: x counts columns from the left, y counts rows from the top,
 * so North (up) means y gets smaller. The static map never changes during a run.
 * Cargo moves, so it is tracked separately by the simulator.
 */
public class Field {
    public final int width;
    public final int height;
    private final char[][] tiles;          // tiles[y][x]; S and C are stored as '.'
    private final int startX;
    private final int startY;
    private final List<int[]> startCargo;  // each entry is {x, y}

    private Field(int width, int height, char[][] tiles, int startX, int startY, List<int[]> cargo) {
        this.width = width;
        this.height = height;
        this.tiles = tiles;
        this.startX = startX;
        this.startY = startY;
        this.startCargo = cargo;
    }

    /** Reads a field from a text file. Throws IllegalArgumentException with a plain message if it is malformed. */
    public static Field load(String path) throws IOException {
        List<String> rows = new ArrayList<String>();
        for (String line : Files.readAllLines(Paths.get(path), StandardCharsets.UTF_8)) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith(";")) {
                continue;
            }
            rows.add(trimmed);
        }
        if (rows.isEmpty()) {
            throw new IllegalArgumentException(path + " has no map rows in it.");
        }
        int width = rows.get(0).length();
        int height = rows.size();
        char[][] tiles = new char[height][width];
        List<int[]> cargo = new ArrayList<int[]>();
        int sx = -1;
        int sy = -1;
        int starts = 0;
        for (int y = 0; y < height; y++) {
            String row = rows.get(y);
            if (row.length() != width) {
                throw new IllegalArgumentException("Map row " + (y + 1) + " is " + row.length()
                        + " characters wide, but the first row is " + width + ".");
            }
            for (int x = 0; x < width; x++) {
                char c = row.charAt(x);
                if (c == 'S') {
                    sx = x;
                    sy = y;
                    starts++;
                    tiles[y][x] = '.';
                } else if (c == 'C') {
                    cargo.add(new int[] {x, y});
                    tiles[y][x] = '.';
                } else if (c == '#' || c == '.' || c == 'Z' || c == 'H' || c == 'P') {
                    tiles[y][x] = c;
                } else {
                    throw new IllegalArgumentException("Unknown map symbol '" + c + "' at x=" + x + ", y=" + y + ".");
                }
            }
        }
        if (starts != 1) {
            throw new IllegalArgumentException("The map needs exactly one S (robot start), but has " + starts + ".");
        }
        return new Field(width, height, tiles, sx, sy, cargo);
    }

    /** The tile at (x, y): '#' wall, '.' floor, 'Z' low zone, 'H' high zone, 'P' parking. Anything off the map is a wall. */
    public char at(int x, int y) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return '#';
        }
        return tiles[y][x];
    }

    public boolean isWall(int x, int y) {
        return at(x, y) == '#';
    }

    public int startX() {
        return startX;
    }

    public int startY() {
        return startY;
    }

    /** A copy of the starting cargo positions. */
    public List<int[]> startCargo() {
        List<int[]> copy = new ArrayList<int[]>();
        for (int[] c : startCargo) {
            copy.add(new int[] {c[0], c[1]});
        }
        return copy;
    }

    /** One string per map row, showing only the fixed tiles. */
    public String[] rows() {
        String[] out = new String[height];
        for (int y = 0; y < height; y++) {
            out[y] = new String(tiles[y]);
        }
        return out;
    }
}
