use std::io;
use std::{thread,time};

fn main() -> io::Result<()> {
    let mut buffer = String::new();
    let stdin = io::stdin();
    stdin.read_line(&mut buffer)?;
    println!("{}", buffer);
    thread::sleep(time::Duration::from_millis(100000));
    Ok(())
}