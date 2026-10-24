(() => {
  const output = document.getElementById('output');
  const input = document.getElementById('command');
  const history = [];
  let historyIndex = 0;
  let draft = '';
  let cwd = '/home/guest';
  let restored = false;
  let rewardShown = false;
  const files = {
    '/home/guest/README.txt': '【障害調査依頼】\n10月31日、R1Qu3ur様へのプレゼント配送が停止しました。\n\n1. systemctl status present\n2. journalctl -u present\n3. sudo systemctl restart present\n4. cat present.txt\n\n清楚サービスの復旧は今回の対象外です。',
    '/home/guest/present.txt': '配送状況を確認しています……',
    '/home/guest/quotes.txt': 'lol民がカヌレなんか食うわけないだろ\n俺のヌクちゃんで抜けねえってのかよ\n俺は清楚を捨てる\nお前の〇ッチにぶっさしてやるよ\nわたしは幸せな人間が許せない\n好きすぎるだろ!!!',
    '/home/guest/.secret': '清楚はインストール時点で同梱されていませんでした。',
    '/var/log/birthday.log': '[INFO] 本日の主役を検出: R1Qu3ur\n[WARN] seiso.service: 本人の意思により停止\n[ERROR] present.service: 配送担当者が名言集を読んでいます\n[HINT] sudo systemctl restart present',
    '/etc/motd': 'Happy Birthday, R1Qu3ur!\n技術は令和、魂は平成。'
  };
  const dirs = ['/', '/home', '/home/guest', '/var', '/var/log', '/etc'];
  function resolve(path) {
    const parts = (path.startsWith('/') ? path : cwd + '/' + path).split('/');
    const result = [];
    for (const part of parts) {
      if (part === '..') result.pop();
      else if (part && part !== '.') result.push(part);
    }
    return '/' + result.join('/');
  }
  function print(text, type = '') {
    const line = document.createElement('div');
    line.className = 'line ' + type;
    line.textContent = text;
    output.append(line);
    while (output.children.length > 220) output.firstElementChild.remove();
    output.scrollTop = output.scrollHeight;
  }
  function reward() {
    if (rewardShown) return;
    rewardShown = true;
    const box = document.createElement('div');
    box.className = 'reward';
    const message = document.createElement('div');
    message.textContent = '配送経路を確保しました。R1Qu3ur様宛の荷物はこちらです。';
    const link = document.createElement('a');
    link.href = 'present.html';
    link.textContent = '🎁 present.zip を受け取る →';
    box.append(message, link);
    output.append(box);
    output.scrollTop = output.scrollHeight;
  }
  function service(name) {
    if (name === 'seiso') {
      print('● seiso.service — 清楚維持サービス\n   Loaded: not-found (パッケージ未提供)\n   Active: failed\n   Reason: 「俺は清楚を捨てる」', 'error');
    } else if (name === 'present') {
      print('● present.service — 誕生日プレゼント配送\n   Active: ' + (restored ? 'active (running)\n   Status: 祝福を配送中。cat present.txt を実行してください。' : 'failed (名言集の読み込みに夢中)\n   Hint: journalctl -u present'), restored ? 'success' : 'error');
    } else print('Unit ' + name + '.service could not be found.', 'error');
  }
  function execute(raw) {
    const command = raw.trim();
    if (!command) return;
    print(document.getElementById('prompt').textContent + ' ' + command, 'command-line');
    history.push(command);
    historyIndex = history.length;
    const args = command.split(/\s+/);
    const verb = args[0];
    if (verb === 'help') {
      print('利用可能なコマンド\n  ls [-a] [パス] / pwd / cd パス / cat ファイル\n  systemctl status present|seiso\n  journalctl -u present|r1qu3ur\n  sudo systemctl restart present\n  whoami / hostname / uname -a / date / uptime / df -h\n  ping birthday.local / echo 文字列 / clear / exit\n\nまずは cat README.txt で依頼書を確認してください。\n画面下のボタンからも実行できます。');
    } else if (verb === 'clear') { output.replaceChildren(); rewardShown = false; }
    else if (verb === 'pwd') print(cwd);
    else if (verb === 'cd') {
      const path = resolve(!args[1] || args[1] === '~' ? '/home/guest' : args[1]);
      if (dirs.includes(path)) cwd = path;
      else print('bash: cd: ' + args[1] + ': No such directory', 'error');
    } else if (verb === 'ls') {
      const target = resolve(args.slice(1).find(a => !a.startsWith('-')) || '.');
      if (!dirs.includes(target)) print('ls: directory not found: ' + target, 'error');
      else {
        const prefix = target === '/' ? '/' : target + '/';
        const entries = [...dirs, ...Object.keys(files)].filter(p => p.startsWith(prefix) && p !== target && !p.slice(prefix.length).includes('/')).map(p => p.slice(prefix.length) + (dirs.includes(p) ? '/' : ''));
        print(entries.filter(n => args.includes('-a') || args.includes('-la') || !n.startsWith('.')).join('  ') || '(empty)');
      }
    } else if (verb === 'cat') {
      if (!args[1]) print('使用例: cat README.txt');
      else for (const arg of args.slice(1)) {
        const path = resolve(arg);
        if (!(path in files)) print('cat: ' + arg + ': No such file', 'error');
        else if (path === '/home/guest/present.txt') {
          if (restored) reward();
          else print('配送が停止しています。\nsystemctl status present で確認してください。', 'error');
        } else print(files[path]);
      }
    } else if (verb === 'systemctl' && args[1] === 'status') service((args[2] || 'present').replace(/\.service$/, ''));
    else if (verb === 'journalctl') {
      if (args.includes('r1qu3ur')) print(files['/home/guest/quotes.txt'].split('\n').map(q => '[r1qu3ur] ' + q).join('\n'));
      else print(files['/var/log/birthday.log'] + (restored ? '\n[OK] present.service: 再起動に成功' : ''));
    } else if (command === 'sudo systemctl restart present' || command === 'sudo systemctl restart present.service') {
      restored = true;
      document.getElementById('state').textContent = '● 配送経路 復旧済み';
      document.getElementById('mission').textContent = '復旧成功！ cat present.txt で荷物を受け取ってください。';
      print('[OK] present.service を再起動しました。\n[OK] 清楚への依存関係を解除しました。\n[OK] お祝いを優先します。\n\n次のコマンド: cat present.txt', 'success');
    } else if (verb === 'systemctl' && args[1] === 'restart') print('Access denied. sudo を付けて実行してください。', 'error');
    else if (verb === 'whoami') print('guest（本日の主役候補：R1Qu3ur）');
    else if (verb === 'hostname') print('birthday-prod-1031');
    else if (verb === 'uname') print('Birthday Linux birthday-prod-1031 10.31-LTS #1 SMP HAPPY_BIRTHDAY x86_64 GNU/Linux');
    else if (verb === 'date') print(new Date().toLocaleString('ja-JP', {timeZone:'Asia/Tokyo'}) + ' JST');
    else if (verb === 'uptime') print('up ✖✖ years, 1 主役, load average: 10.31, 10.31, 10.31');
    else if (verb === 'df') print('Filesystem       Size  Used Avail Use% Mounted on\n/dev/memories    100G   99G    1G  99% /思い出\n/dev/seiso         0B    0B    0B   -- /清楚\n/dev/blessing      ∞     ∞     ∞   -- /祝福');
    else if (verb === 'ping') print('PING birthday.local (10.31.10.31)\n64 bytes: icmp_seq=1 ttl=64 time=0.31 ms\n64 bytes: icmp_seq=2 ttl=64 time=0.31 ms\n--- 祝福への疎通確認: 成功 / packet loss 0% ---', 'success');
    else if (verb === 'echo') print(args.slice(1).join(' '));
    else if (verb === 'exit' || verb === 'logout') print('本日のオンコールは終了できません。祝福を受領してください。');
    else if (verb === 'sudo') print('sudo: その操作は誕生日管理者によりネタにされました。\n使える操作: sudo systemctl restart present');
    else if (verb === 'rm') print('rm: 思い出は削除できません。', 'error');
    else print('bash: ' + verb + ': command not found\nhelp でコマンド一覧を表示できます。', 'error');
    document.getElementById('prompt').textContent = 'guest@birthday-prod-1031:' + (cwd === '/home/guest' ? '~' : cwd) + '$';
  }
  document.getElementById('commandForm').addEventListener('submit', event => {
    event.preventDefault();
    execute(input.value);
    input.value = '';
  });
  document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => {execute(button.dataset.command); input.value = '';}));
  const completions = ['help','ls','ls -a','pwd','cd /var/log','cd /home/guest','cat README.txt','cat quotes.txt','cat present.txt','systemctl status present','systemctl status seiso','journalctl -u present','journalctl -u r1qu3ur','sudo systemctl restart present','whoami','hostname','uname -a','date','uptime','df -h','ping birthday.local','clear','exit'];
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex === history.length) draft = input.value;
      historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
      input.value = historyIndex === history.length ? draft : history[historyIndex];
    } else if (event.key === 'Tab') {
      const matches = completions.filter(c => c.startsWith(input.value));
      if (matches.length === 1) {event.preventDefault(); input.value = matches[0];}
      else if (matches.length > 1 && input.value) {event.preventDefault(); print(matches.join('\n'), 'muted');}
    } else if (event.ctrlKey && event.key.toLowerCase() === 'l') {
      event.preventDefault(); output.replaceChildren(); rewardShown = false;
    }
  });
  print('Birthday Linux 10.31 LTS — birthday-prod-1031\nLast login: from VRChat\n\nおかえりなさい、インフラ担当者。\nhelp でコマンドを確認、cat README.txt で調査開始。', 'muted');
})();
