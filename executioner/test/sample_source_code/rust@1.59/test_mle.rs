use std::io;

fn main() -> io::Result<()> {
    let mut buffer = String::new();
    let stdin = io::stdin();
    stdin.read_line(&mut buffer)?;
    let mut bulk = Vec::new();
    while true {
      bulk.push("Bulk");
    }
    Ok(())
}
