import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

public class test_error {
    public static void main(String[]args) throws Exception {
        BufferedReader reader = new BufferedReader (new InputStreamReader(System.in));
        long input = Integer.parseInt(reader.readLine());
          throw new Exception("Error");
    }
}
