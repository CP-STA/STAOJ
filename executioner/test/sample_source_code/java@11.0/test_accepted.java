import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

public class test_accepted {
    public static void main(String[]args) throws IOException {
        BufferedReader reader = new BufferedReader (new InputStreamReader(System.in));
        long input = Integer.parseInt(reader.readLine());
        System.out.println(input);
    }
}
