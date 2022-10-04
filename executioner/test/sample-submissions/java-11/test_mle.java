import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Vector;

public class test_mle {
    public static void main(String[] args) throws IOException {
        BufferedReader reader = new BufferedReader (new InputStreamReader(System.in));
        long input = Integer.parseInt(reader.readLine());
        Vector<int[]> bulk = new Vector<>();
        while (true) {
            bulk.add(new int[Integer.MAX_VALUE - 5]);
        }
    }
}