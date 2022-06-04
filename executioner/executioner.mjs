import { execSync } from 'child_process';
import * as fs from 'fs';
import * as si from './socket_interface.mjs';
import * as path from 'path';

// Adresses
const to = "webserver";
const here = "executioner";

// Resource limits
let mem_limit = 0;
let time_limit = 0;

let tmp_dir;
let mount_dir;
let compiled_name;
let compiled_out;
let compiled_err;

// Messages
let compiling_message;
let compiled_message;
let testing_message;
let tested_message;
let done_message;

// Environmental variables
const sock_path = process.env.EXER_SOCKET;
if (sock_path == null) {
    console.error("EXER_SOCKET is undefined");
    process.exit(1);
}

const repo_path = process.env.REPO_PATH;
if (repo_path == null) {
    console.error("REPO_PATH is undefined");
    process.exit(1);
}

// Initialise socket path and receiver function
try {
    si.init_socket(sock_path);
    si.set_receiver_callback(run_executioner);
    console.log("Connected to socket");
}
catch {
    console.error(`could not connect to socket at ${sock_path}`);
    process.exit(1);
}

function run_executioner (message) {
    // Ensure message is to executioner
    if (message.to !== here) {
        return
    }

    // Exit function for cleaning up
    function exit_gracefully (exit_code = 0, no_exit = false) {
        si.send_message(done_message);
        fs.rmdirSync(tmp_dir, {recursive: true, force: true});
        if (!no_exit) {
            process.exit(exit_code);
        }
    }

    // Configure the tmp environments and define the constants
    try {
        prep_environment(message);
    }
    catch(error) {
        console.error(error);
        exit_gracefully(1)
    }

    // Notify on compiling
    si.send_message(compiling_message);

    // Compile the code
    try {
        compile_code(`${tmp_dir}/${message.source_code_file_name}`, message.language, compiled_name);
        compiled_message.result = "success";
        si.send_message(compiled_message);
    }
    catch (compile_error) {
        compiled_message.result = "error";
        console.error("Compilation error")
        console.error(compile_error);
        si.send_message(compiled_message);
        exit_gracefully(1);
    }

    fs.copyFileSync(compiled_name, `${mount_dir}/${path.basename(compiled_name)}`)

    // Testing each case
    let count = 1;

    // Read all the .in files in the tmp dir
    fs.readdirSync(`${tmp_dir}/tests`)
      .filter(function(file) {
        return path.extname(file).toLowerCase() === ".in"
      })
      .forEach(function(test_in) {
        // Setting correct absolute pat
        test_in = `${tmp_dir}/tests/${test_in}`;

        // Setting the test count
        testing_message.test_case = count;
        tested_message.test_case = count;

        // Testing message
        si.send_message(testing_message);

        try {
            // Move test in to mount
            fs.copyFileSync(test_in, `${mount_dir}/${path.basename(test_in)}`)

            // Execute code
            run_code(compiled_name, message.language, test_in, compiled_out, compiled_err);
            
            // Extract info and cut from out file
            const info = execSync(`tail -n -2 ${compiled_out}`).toString();
            const both_lines = info.split("\n");

            const time_used = both_lines[0].split(" ").pop();
            const mem_used = both_lines[1].split(" ").pop();

            // Remove resource info at end
            // TODO: Find a sync npm package to do this
            execSync(`head -n -2 ${compiled_out} > ${tmp_dir}/tmp && mv ${tmp_dir}/tmp ${compiled_out}`);

            // Parse out file and check that it exists
            let test_out = path.win32.basename(test_in, "in") + "out";
            test_out = `${tmp_dir}/tests/${test_out}`;
            if (!fs.existsSync(test_out)) {
                console.error(`Corresponding out file, ${test_out}, does not exist`);
                exit_gracefully(1);
            }

            // Compare test cases
            try {
                // TODO: Find a sync npm package to do this
                execSync(`diff ${compiled_out} ${test_out}`);
                tested_message.time_ms = time_used;
                tested_message.memory_kb = mem_used;
                tested_message.result = "accepted";
            }
            catch(error) {
                tested_message.result = "wrong";
            }
        }
        catch(error) {
            console.error("Execution error");
            console.error(error);

            const status = execSync(`tail -n -1 ${error_out}`);
            if (status.search("time")) {`${repo_path}/problems/${message.problem} not found`
                tested_message.result = "TLE";
            }
            else if (status.search("memory")) {
                tested_message.result = "MLE";
            }
            else {
                tested_message.result = "error";
            }
        }
        si.send_message(tested_message);

        count++;
      });

      exit_gracefully(0, true);
}

function prep_environment(message) {
    // Define base for messages
    compiling_message = {
        to: to,
        id: message.id,
        state: "compiling"
    }

    compiled_message = {
        to: to,
        id: message.id,
        state: "compiled",
    }

    testing_message = {
        to: to,
        id: message.id,
        state: "testing",
    }

    tested_message = {
        to: to,
        id: message.id,
        state: "tested",
    }

    done_message = {
        to: to,
        id: message.id,
        state: "done"
    }

    // Create tmp dir
    tmp_dir = `/tmp/${message.id}`
    fs.mkdirSync(tmp_dir);

    // Create dir to be mounted
    mount_dir = `${tmp_dir}/mount`
    fs.mkdirSync(mount_dir)

    // Set compiled names
    compiled_name = `${tmp_dir}/compiled`;
    compiled_out = `${mount_dir}/compiled.out`;
    compiled_err = `${mount_dir}/error.err`;

    // Write source code to file
    fs.writeFileSync(`${tmp_dir}/${message.source_code_file_name}`, message.source_code_content);

    // Check if problem exists
    if (fs.existsSync(`${repo_path}/problems/${message.problem}`)) {

        // Read test cases and parse json (assumed to be auditted)
        const tests_raw = fs.readFileSync(`${repo_path}/problems/${message.problem}/test_cases.json`);
        const test_cases = JSON.parse(tests_raw);

        // Create tests directory
        fs.mkdirSync(`${tmp_dir}/tests`);

        // Create test in and out files
        // Script will automatically look for .in and .out files when running
        for (var i = 1; i <= test_cases.length; i++) {
            let n = i.toString();
            let l = test_cases.length.toString().length;
            n = "0".repeat(l - n.length) + n;
            fs.writeFileSync(`${tmp_dir}/tests/test${n}.in`, test_cases[i - 1].input);
            fs.writeFileSync(`${tmp_dir}/tests/test${n}.out`, test_cases[i - 1].output);
        }

        // Read constrains file and parse json
        const constrains_raw = fs.readFileSync(`${repo_path}/problems/${message.problem}/constrains.json`);
        const limits = JSON.parse(constrains_raw);

        mem_limit = parseInt(limits.memory_kb);
        time_limit = parseInt(limits.time_ms);
    }
    else {
        throw Error(`${repo_path}/problems/${message.problem} not found`)
    }
}

function compile_code(source_code, language, out_file) {
    switch (language) {
        case "gcc@11.3":
            execSync(`g++ ${source_code} -o ${out_file}`);
            break;
        default:
            throw Error(`${language} is unsupported`);
    }
}

function run_code(compiled_code, language, test_input, compiled_out, error_out) {
    switch (language) {
        case "java@**":
            // Special case for java

            break;
        default:
            //execSync(`podman build --build-arg MAX_MEM=${mem_limit} --build-arg MAX_TIME=${time_limit} . -t executioner`)
            //execSync(`podman run -itv ${mount}:/app/mount executioner ./demoter.out mount/${compiled_code} 1> mount/${compiled_out} 2> mount/${error_out} < mount/${test_input}`)
            execSync(`MAX_MEM=${mem_limit} MAX_TIME=${time_limit} ./demoter.out ${compiled_code} 1> ${compiled_out} 2> ${error_out} < ${test_input}`)
            break;
    }
}
