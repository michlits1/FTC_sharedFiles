import java.util.List;

/**
 * Turns a finished run into a replay.json file that the viewer can play back.
 * The format is plain JSON on purpose, so any other tool or app could read it too.
 */
public class Replay {

    public static String toJson(Sim sim, String outcome) {
        Field field = sim.field();
        StringBuilder sb = new StringBuilder();
        sb.append("{\n");
        sb.append("  \"version\": 1,\n");

        sb.append("  \"field\": {\"width\": ").append(field.width)
                .append(", \"height\": ").append(field.height)
                .append(", \"start\": [").append(field.startX()).append(", ").append(field.startY()).append("], \"rows\": [");
        String[] rows = field.rows();
        for (int i = 0; i < rows.length; i++) {
            if (i > 0) {
                sb.append(", ");
            }
            sb.append(quote(rows[i]));
        }
        sb.append("]},\n");

        sb.append("  \"rules\": {\"maxCommands\": ").append(Rules.MAX_COMMANDS)
                .append(", \"points\": {\"Z\": ").append(Rules.POINTS_LOW)
                .append(", \"H\": ").append(Rules.POINTS_HIGH)
                .append(", \"P\": ").append(Rules.POINTS_PARK).append("}},\n");

        sb.append("  \"frames\": [\n");
        List<Sim.Frame> frames = sim.frames();
        for (int i = 0; i < frames.size(); i++) {
            Sim.Frame f = frames.get(i);
            sb.append("    {\"cmd\": ").append(quote(f.cmd))
                    .append(", \"ok\": ").append(f.ok)
                    .append(", \"note\": ").append(quote(f.note))
                    .append(", \"x\": ").append(f.x)
                    .append(", \"y\": ").append(f.y)
                    .append(", \"dir\": ").append(quote(f.dir))
                    .append(", \"carrying\": ").append(f.carrying)
                    .append(", \"score\": ").append(f.score)
                    .append(", \"cargo\": [");
            for (int j = 0; j < f.cargo.size(); j++) {
                if (j > 0) {
                    sb.append(", ");
                }
                sb.append("[").append(f.cargo.get(j)[0]).append(", ").append(f.cargo.get(j)[1]).append("]");
            }
            sb.append("]}");
            sb.append(i < frames.size() - 1 ? ",\n" : "\n");
        }
        sb.append("  ],\n");

        sb.append("  \"result\": {\"score\": ").append(sim.score())
                .append(", \"commandsUsed\": ").append(sim.used())
                .append(", \"low\": ").append(sim.lowCount())
                .append(", \"high\": ").append(sim.highCount())
                .append(", \"parked\": ").append(sim.parked())
                .append(", \"ended\": ").append(quote(outcome))
                .append(", \"error\": ").append(sim.error() == null ? "null" : quote(sim.error()))
                .append("}\n");
        sb.append("}\n");
        return sb.toString();
    }

    /** Wraps text in double quotes and escapes anything JSON does not allow. */
    static String quote(String s) {
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '"') {
                sb.append("\\\"");
            } else if (c == '\\') {
                sb.append("\\\\");
            } else if (c == '\n') {
                sb.append("\\n");
            } else if (c == '\r') {
                sb.append("\\r");
            } else if (c == '\t') {
                sb.append("\\t");
            } else if (c < 0x20) {
                sb.append(String.format("\\u%04x", (int) c));
            } else {
                sb.append(c);
            }
        }
        return sb.append("\"").toString();
    }
}
