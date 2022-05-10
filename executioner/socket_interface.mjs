import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

import { spawn } from 'child_process';


const address = "executioner";

const executioner_script = "executioner.sh";
const tmp_files_dir = "/tmp"

const sock_path = process.env.EXER_SOCKET;
const repo_path = process.env.REPO_PATH;

const ws = new WebSocket("ws+unix://" + sock_path);

console.log("Connected to Socket")

// Upon receiving a message
ws.on("message", function (raw) {

    const message = JSON.parse(raw);
    
    // Make sure message is addressed to executioner
    if (message.to === address) {

        // Constraints
        let mem_limit = 0;
        let time_limit = 0;

        console.log("Submission received")

        // Create unique directory to avoid name clashes between submissions
        const testing_dir = `${tmp_files_dir}/${message.id}`
        fs.mkdirSync(testing_dir);

        // Write source code to file and pass file path to script
        fs.writeFileSync(`${testing_dir}/${message.source_code_file_name}`, message.source_code_content);

        if (fs.existsSync(`problems/${message.problem}`)) {

            // Read test cases and parse json
            const tests_raw = fs.readFileSync(`problems/${message.problem}/test_cases.json`);
            const test_cases = JSON.parse(tests_raw);

            fs.mkdirSync(`${testing_dir}/tests`);

            // Create test in and out files
            // Script will automatically look for .in and .out files
            for (var i = 0; i < test_cases.length; i++) {
                fs.writeFileSync(`${testing_dir}/tests/test${i}.in`, test_cases[i].input);
                fs.writeFileSync(`${testing_dir}/tests/test${i}.out`, test_cases[i].output);
            }

            // Read constrains file and parse json
            const constrains_raw = fs.readFileSync(`problems/${message.problem}/constrains.json`);
            const limits = JSON.parse(constrains_raw);

            mem_limit = parseInt(limits.memory_kb);
            time_limit = parseInt(limits.time_ms);

        }
        else {
            console.error("Problem directory not found");
        }

        // Runs the script asynchronously to others
        if (fs.existsSync(executioner_script)) {
            console.log("Executing the executioner script")
            const script = spawn(`./${executioner_script}`,
                [`${testing_dir}/${message.source_code_file_name}`, message.language, testing_dir, time_limit, mem_limit]);

            // When the script writes to stdout, it should be sent out 
            script.stdout.on("data", function (raw) {
                const obj = JSON.parse(raw);
                obj.id = message.id;
                obj.to = "webserver";
                ws.send(JSON.stringify(obj));
            });

        }
        else {
            console.log(`${executioner_script} not found`);
        }
    }

});




