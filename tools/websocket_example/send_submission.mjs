import { WebSocket } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join as join_path } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sock_path = join_path(__dirname, 'staoj.exe.sock')
var client = new WebSocket("ws+unix://" + sock_path)
client.on('open', function open() {
  client.send(JSON.stringify(
    {
      to: "executioner",
      id: uuidv4(),
      source_code_file_name: "two.cpp",
      language: "gcc-11.3",
      source_code_content: `# include <bits/stdc++.h>
using namespace std;
typedef long long ll;
ll n;
int main () {
  cin >> n;
  cout << n * 2 << endl;
  return 0;
}
`,
      problem: "two-times"
    }
));
  client.close()
})