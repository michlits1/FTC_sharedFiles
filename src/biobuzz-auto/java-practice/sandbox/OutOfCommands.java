/**
 * Thrown when your robot tries to do something after its command budget is used up.
 * The simulator catches it and ends the run normally, so you never need to handle it.
 */
public class OutOfCommands extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public OutOfCommands() {
        super("Out of commands");
    }
}
