import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

public class test_hang {
    public static void main(String[]args) throws IOException, InterruptedException {
        BufferedReader reader = new BufferedReader (new InputStreamReader(System.in));
        long input = Integer.parseInt(reader.readLine());
        System.out.println(input);
        Thread.sleep(100000);
    }
}
