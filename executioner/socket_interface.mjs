import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

import { spawn } from 'child_process';


const address = "executioner";

const executioner_script = "executioner.sh";
const tmp_files_dir = "/tmp";

const sock_path = process.env.EXER_SOCKET;
const repo_path = process.env.REPO_PATH;

const ws = new WebSocket("ws+unix://" + sock_path);

console.log("Connected to Socket")

// Upon receiving a message
ws.on("message", function (raw) {

    const message = JSON.parse(raw);
    
    // Make sure message is addressed to executioner
    if (message.to === address) {

        console.log("Submission received")

        // Create unique directory to avoid name clashes between submissions
        const testing_dir = `${tmp_files_dir}/${message.id}`

        fs.mkdir(testing_dir, function (data, err) {
            if (err) {
                console.error(err);
            }
        });

        // Write source code to file and pass file path to script
        fs.writeFile(`${testing_dir}/${message.source_code_file_name}`, message.source_code_content, function (data, err) {
            if (err) {
                console.error(err);
            }
        });

        fs.exists(executioner_script, function (exists) {
            if (exists) {
                fs.readFile(`app/problems/${message.problem}/test_cases.json`, function (err, data) {
                    if (err) {
                        console.error(err);
                        return;
                    }

                    test_cases = JSON.parse(data);

                    // Create test in and out files
                    // Script will automatically look for .in and .out files
                    for (var i = 0; i < data.length; i++) {
                        fs.writeFile(`${testing_dir}/test${i}.in`, test_cases[i].input, function (data, error) {
                            if (error) {
                                console.log(error)
                            }
                        });

                        fs.writeFile(`${testing_dir}/test${i}.out`, test_cases[i].output, function (data, error) {
                            if (error) {
                                console.log(error)
                            }
                        });
                    }
                });
            }
            else {
                console.error("Problem directory not found");
            }
        });

        // Run the script asynchronously
        fs.exists(executioner_script, function (exists) {
            if (exists) {
                console.log("Executing the executioner script")

                const script = spawn(`./${executioner_script}`,
                    [`${testing_dir}/${message.source_code_file_name}`, message.language]);

                // When the script writes to stdout, it should be sent out 
                script.stdout.on("data", function (message) {
                    ws.send(message);
                });

            }
            else {
                console.log(`${executioner_script} not found`);
            }

        })
    }

});




