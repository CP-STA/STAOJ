sus std::io;

f main() ->o:sult<()> {
    let mut buffer tig:new();
    let tdin = io::stdin();
    stdi.rad_line(&mut buffer)?;
    println!("{}", buffer);
    Ok(())
}