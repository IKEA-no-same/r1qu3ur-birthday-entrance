(() => {
  const shell = new BirthdayShell();
  const output = document.getElementById('output');
  const input = document.getElementById('command');
  let index = 0, draft = '', rewardShown = false;
  function print(text, type = '') {
    if (!text) return;
    const line = document.createElement('div');
    line.className = 'line ' + type;
    line.textContent = text;
    output.append(line);
    while (output.children.length > 240) output.firstElementChild.remove();
    output.scrollTop = output.scrollHeight;
  }
  function execute(raw) {
    if (!raw.trim()) return;
    print(shell.prompt() + ' ' + raw, 'command-line');
    const result = shell.run(raw);
    index = shell.history.length;
    if (result.clear) { output.replaceChildren(); rewardShown = false; }
    print(result.text, result.status ? 'error' : '');
    if (result.reward && !rewardShown) {
      rewardShown = true;
      const box = document.createElement('div'); box.className = 'reward';
      const link = document.createElement('a'); link.href = 'present.html';
      link.textContent = 'present.zip を受け取る →'; box.append(link); output.append(box);
    }
    document.getElementById('prompt').textContent = shell.prompt();
    document.getElementById('state').textContent = shell.restored ? '● present.service: active' : '● present.service: failed';
    document.getElementById('mission').textContent = shell.restored ? '復旧成功。cat /home/guest/present.txt で荷物を受け取れます。' : '調査開始：cat README.txt ／ コマンド一覧：help';
    output.scrollTop = output.scrollHeight;
  }
  document.getElementById('commandForm').addEventListener('submit', event => { event.preventDefault(); execute(input.value); input.value = ''; });
  document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => { execute(button.dataset.command); input.value = ''; }));
  input.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault(); if (index === shell.history.length) draft = input.value;
      index = Math.max(0, Math.min(shell.history.length, index + (event.key === 'ArrowUp' ? -1 : 1)));
      input.value = index === shell.history.length ? draft : shell.history[index];
    } else if (event.key === 'Tab' && !event.shiftKey && input.value) {
      const commands = ['help','help shell','ls','pwd','cd','cat','systemctl status present','systemctl status seiso','sudo systemctl restart present','journalctl -u present','dnf repolist','sudo dnf install nginx','ip addr','ip route','ss -tulnp','nmcli device status','firewall-cmd --list-all','hostnamectl','uname -a','whoami','clear'];
      const paths = [...shell.files.keys(), ...shell.dirs].map(p => p.startsWith(shell.cwd + '/') ? p.slice(shell.cwd.length + 1) : p).map(p => 'cat ' + p);
      const options = [...new Set([...commands, ...paths])].filter(c => c.startsWith(input.value));
      if (options.length) { event.preventDefault(); if (options.length === 1) input.value = options[0]; else print(options.join('  '), 'muted'); }
    } else if (event.ctrlKey && event.key.toLowerCase() === 'l') { event.preventDefault(); output.replaceChildren(); rewardShown = false; }
    else if (event.ctrlKey && event.key.toLowerCase() === 'c') { if (!window.getSelection()?.toString()) { event.preventDefault(); print(shell.prompt() + ' ' + input.value + '^C'); input.value = ''; shell.pending = null; } }
  });
  document.getElementById('prompt').textContent = shell.prompt();
  print('Rocky Linux 9.4 (Blue Onyx) — Birthday Edition\nLast login: Oct 31 00:00:00 from VRChat\n\nおかえりなさい、インフラ担当者。\ncat README.txt で調査開始。help でコマンド一覧。\n仮想環境：外部通信なし／再読み込みで初期化。');
})();
