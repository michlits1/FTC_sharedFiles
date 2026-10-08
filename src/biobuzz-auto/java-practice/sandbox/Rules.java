/**
 * THE RULES OF THE GAME.
 *
 * You are allowed to change these numbers. Try it and see how your strategy changes.
 * Scoring is worked out from the final state of the field, when your run ends:
 *   - each cargo lying on a Z tile is worth POINTS_LOW
 *   - each cargo lying on an H tile is worth POINTS_HIGH
 *   - if the robot is standing on a P tile, it earns POINTS_PARK
 * Cargo that the robot is still carrying counts for nothing.
 */
public class Rules {
    /** Every command costs one. When they run out, the run is over. */
    public static final int MAX_COMMANDS = 50;

    public static final int POINTS_LOW = 10;
    public static final int POINTS_HIGH = 25;
    public static final int POINTS_PARK = 5;
}
