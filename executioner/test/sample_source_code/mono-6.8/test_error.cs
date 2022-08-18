using System;

class TestError {
   static void Main() {
      string val;
      val = Console.ReadLine();
      int a = Convert.ToInt32(val);
      throw new Exception("Error");
   }
}