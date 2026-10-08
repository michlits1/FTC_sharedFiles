/**
 * THE ROBOT YOU PROGRAM. This is the only thing your strategy talks to.
 *
 * COMMANDS (each one uses up one command from your budget):
 *   robot.forward()      move one tile the way the robot is facing (a wall wastes the command)
 *   robot.turnLeft()     turn 90 degrees to the left
 *   robot.turnRight()    turn 90 degrees to the right
 *   robot.grab()         pick up the cargo on this tile (only one piece can be carried)
 *   robot.release()      put the carried cargo down on this tile (one piece per tile)
 *
 * SENSORS (free, they never use up commands):
 *   robot.x(), robot.y()          where the robot is
 *   robot.heading()               'N', 'E', 'S' or 'W'
 *   robot.wallAhead()             true if the next forward() would hit a wall
 *   robot.hasCargo()              true if carrying cargo
 *   robot.cargoAt(x, y)           true if there is cargo lying on that tile
 *   robot.tile(x, y)              the fixed tile: '#' wall, '.' floor, 'Z' low zone, 'H' high zone, 'P' parking
 *   robot.width(), robot.height() size of the field
 *   robot.commandsLeft()          how many commands remain
 *   robot.score()                 the score if the run ended right now
 */
public class Robot {
    private final Sim sim;

    public Robot(Sim sim) {
        this.sim = sim;
    }

    public void forward() {
        sim.forward();
    }

    public void turnLeft() {
        sim.turnLeft();
    }

    public void turnRight() {
        sim.turnRight();
    }

    public void grab() {
        sim.grab();
    }

    public void release() {
        sim.release();
    }

    public int x() {
        return sim.x();
    }

    public int y() {
        return sim.y();
    }

    public char heading() {
        return sim.heading();
    }

    public boolean wallAhead() {
        return sim.wallAhead();
    }

    public boolean hasCargo() {
        return sim.hasCargo();
    }

    public boolean cargoAt(int x, int y) {
        return sim.cargoAt(x, y);
    }

    public char tile(int x, int y) {
        return sim.field().at(x, y);
    }

    public int width() {
        return sim.field().width;
    }

    public int height() {
        return sim.field().height;
    }

    public int commandsLeft() {
        return sim.commandsLeft();
    }

    public int score() {
        return sim.score();
    }
}
