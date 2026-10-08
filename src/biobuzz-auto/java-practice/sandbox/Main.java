import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;

/**
 * Runs your Strategy on the field, prints the result, and writes replay.json.
 *
 * You do not need to edit this file. To run:   javac *.java   then   java Main
 */
public class Main {
    private static volatile String outcome = "finished";

    public static void main(String[] args) throws Exception {
        String fieldPath = args.length > 0 ? args[0] : "field.txt";
        Field field;
        try {
            field = Field.load(fieldPath);
        } catch (IOException e) {
            System.out.println("Could not read " + fieldPath + ". Is it in this folder?");
            return;
        } catch (IllegalArgumentException e) {
            System.out.println("Problem with the field file: " + e.getMessage());
            return;
        }

        final Sim sim = new Sim(field);
        final Robot robot = new Robot(sim);

        // The strategy runs on its own thread so a loop that never ends cannot freeze the simulator.
        Thread worker = new Thread(new Runnable() {
            public void run() {
                try {
                    new Strategy().run(robot);
                } catch (OutOfCommands e) {
                    outcome = "out_of_commands";
                } catch (Throwable e) {
                    outcome = "error";
                    sim.setError(describe(e));
                }
            }
        });
        worker.setDaemon(true);
        worker.start();
        worker.join(5000);
        if (worker.isAlive()) {
            sim.close();
            outcome = "timeout";
            sim.setError("Your strategy did not finish within 5 seconds. A loop that never ends, or never uses a command, "
                    + "can cause this. Make sure every loop either uses a command or has a way to stop.");
        }

        report(sim);
        String json = Replay.toJson(sim, outcome);
        Files.write(Paths.get("replay.json"), json.getBytes(StandardCharsets.UTF_8));
        System.out.println("Wrote replay.json. Open it in viewer.html to watch the run.");
        System.exit(0);
    }

    private static void report(Sim sim) {
        System.out.println();
        if (sim.error() != null) {
            System.out.println("PROBLEM: " + sim.error());
            System.out.println();
        }
        if ("out_of_commands".equals(outcome)) {
            System.out.println("The robot ran out of commands, so the run ended there.");
        }
        System.out.println("Commands used: " + sim.used() + " of " + Rules.MAX_COMMANDS);
        System.out.println("Cargo in low zones:  " + sim.lowCount() + " x " + Rules.POINTS_LOW);
        System.out.println("Cargo in high zones: " + sim.highCount() + " x " + Rules.POINTS_HIGH);
        System.out.println("Parked:              " + (sim.parked() ? "yes, +" + Rules.POINTS_PARK : "no"));
        System.out.println("SCORE: " + sim.score());
        System.out.println();
        System.out.println("Final field  (o = cargo,  ^ > v < = robot):");
        Field f = sim.field();
        List<int[]> cargo = sim.cargoNow();
        for (int y = 0; y < f.height; y++) {
            StringBuilder line = new StringBuilder();
            for (int x = 0; x < f.width; x++) {
                char c = f.at(x, y);
                for (int[] k : cargo) {
                    if (k[0] == x && k[1] == y) {
                        c = 'o';
                    }
                }
                if (x == sim.x() && y == sim.y()) {
                    c = "^>v<".charAt(sim.dirIndex());
                }
                line.append(c);
            }
            System.out.println(line);
        }
        System.out.println();
    }

    /** A short, readable description of what went wrong, pointing at the line in Strategy when possible. */
    private static String describe(Throwable e) {
        String where = "";
        for (StackTraceElement el : e.getStackTrace()) {
            if (el.getClassName().startsWith("Strategy")) {
                where = " (Strategy.java, line " + el.getLineNumber() + ")";
                break;
            }
        }
        return e.toString() + where;
    }
}
