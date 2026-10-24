/* Small virtual filesystem and birthday script; no real shell is executed. */
(function (scope) {
  class BirthdayShell {
    constructor() {
      this.cwd = '/home/guest'; this.previous = this.cwd; this.history = [];
      this.scriptPath = '/usr/local/etc/present.sh';
      this.dirs = new Set(['/', '/home', '/home/guest', '/usr', '/usr/local', '/usr/local/etc', '/etc', '/tmp']);
      this.files = new Map(Object.entries({
        '/home/guest/README.txt': 'R1Qu3ur様\n\n/usr/local/etc に荷物を用意しました。\nそこにある present.sh を実行してください。\n\n操作例:\n  cd /usr/local/etc\n  ls -l\n  ./present.sh\n\nお祝いの受け取りに sudo は不要です。',
        '/home/guest/quotes.txt': 'lol民がカヌレなんか食うわけないだろ\n俺のヌクちゃんで抜けねえってのかよ\n俺は清楚を捨てる\nお前の〇ッチにぶっさしてやるよ\nわたしは幸せな人間が許せない\n好きすぎるだろ!!!',
        '/usr/local/etc/README.txt': 'present.sh: R1Qu3ur様宛の荷物を受け取るスクリプト\n実行方法: ./present.sh または bash present.sh',
        '/usr/local/etc/present.sh': '#!/bin/bash\n# Happy Birthday, R1Qu3ur!\nprintf "祝福データを確認しています...\\n"\nprintf "清楚は見つかりませんが、問題ありません。\\n"\nprintf "R1Qu3ur様、お誕生日おめでとう！\\n"\nprintf "荷物のお届け先: present.html\\n"',
        '/etc/os-release': 'NAME="Rocky Linux"\nVERSION="9.4 (Blue Onyx)"\nID="rocky"\nVERSION_ID="9.4"\nPRETTY_NAME="Rocky Linux 9.4 (Blue Onyx)"',
        '/etc/hostname': 'birthday-prod-1031'
      }));
    }
    prompt() { return `[guest@birthday-prod-1031 ${this.cwd === '/home/guest' ? '~' : this.cwd.split('/').pop() || '/'}]$`; }
    path(p = '.') {
      if (p === '~' || p.startsWith('~/')) p = '/home/guest' + p.slice(1);
      const out = [];
      for (const part of (p.startsWith('/') ? p : this.cwd + '/' + p).split('/')) {
        if (part === '..') out.pop(); else if (part && part !== '.') out.push(part);
      }
      return '/' + out.join('/');
    }
    tokenize(text) {
      const words = []; let word = '', quote = '', active = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quote) { if (c === quote) quote = ''; else word += c; }
        else if (c === '"' || c === "'") { quote = c; active = true; }
        else if (c === '\\' && i + 1 < text.length) { word += text[++i]; active = true; }
        else if (/\s/.test(c)) { if (active) words.push(word); word = ''; active = false; }
        else if ('|;&><'.includes(c)) throw new Error('この端末は移動と閲覧用です。コマンドは1行ずつ実行してください。');
        else { word += c; active = true; }
      }
      if (quote) throw new Error('bash: 引用符が閉じられていません。');
      if (active) words.push(word);
      return words;
    }
    complete(value) {
      const commands = ['help', 'ls', 'pwd', 'cd', 'cat', 'clear', 'bash', 'sh', 'whoami', 'hostname', 'uname', 'history'];
      if (!value.includes(' ') && !value.includes('/')) return commands.filter(c => c.startsWith(value));
      const split = value.lastIndexOf(' '), prefix = value.slice(0, split + 1), fragment = value.slice(split + 1);
      const slash = fragment.lastIndexOf('/');
      const typedParent = slash >= 0 ? fragment.slice(0, slash + 1) : '';
      const start = slash >= 0 ? fragment.slice(slash + 1) : fragment;
      const parent = this.path(typedParent || '.');
      const pathPrefix = parent === '/' ? '/' : parent + '/';
      const onlyDirs = /^cd\s/.test(value);
      return [...this.dirs, ...this.files.keys()].filter(p => p.startsWith(pathPrefix) && p !== parent && !p.slice(pathPrefix.length).includes('/') && p.slice(pathPrefix.length).startsWith(start) && (!onlyDirs || this.dirs.has(p))).map(p => prefix + typedParent + p.slice(pathPrefix.length) + (this.dirs.has(p) ? '/' : ''));
    }
    run(text) {
      const r = {text: '', status: 0, clear: false, reward: false};
      if (!text.trim()) return r;
      this.history.push(text);
      try {
        const [cmd, ...a] = this.tokenize(text);
        const flags = a.filter(x => x.startsWith('-')).join('');
        const args = a.filter(x => !x.startsWith('-'));
        if (cmd === 'help') r.text = '荷物は /usr/local/etc にあります。\n\n  cd /usr/local/etc\n  ls -l\n  cat present.sh\n  ./present.sh\n\n対応: cd / ls / cat / pwd / clear / history / whoami / hostname / uname\ncd ..、cd ~、cd -、絶対・相対パス、Tab補完、↑↓履歴も利用できます。\nbash present.sh / sh present.sh でも実行できます。';
        else if (cmd === 'pwd') r.text = this.cwd;
        else if (cmd === 'cd') {
          if (a.length > 1) throw new Error('bash: cd: too many arguments');
          const p = a[0] === '-' ? this.previous : this.path(a[0] || '/home/guest');
          if (!this.dirs.has(p)) throw new Error('bash: cd: ' + a[0] + ': No such directory');
          const old = this.cwd; this.cwd = p; this.previous = old;
          if (a[0] === '-') r.text = this.cwd;
        } else if (cmd === 'ls') {
          const paths = args.length ? args : ['.'];
          r.text = paths.map(item => {
            const p = this.path(item);
            if (this.files.has(p)) return this.entry(p, flags);
            if (!this.dirs.has(p)) throw new Error('ls: cannot access ' + item + ': No such file or directory');
            const prefix = p === '/' ? '/' : p + '/';
            const entries = [...this.dirs, ...this.files.keys()].filter(x => x !== p && x.startsWith(prefix) && !x.slice(prefix.length).includes('/')).sort();
            const names = entries.map(x => this.entry(x, flags));
            if (flags.includes('a')) names.unshift(flags.includes('l') ? 'drwxr-xr-x 1 guest guest 4096 Oct 31 00:00 .' : '.', flags.includes('l') ? 'drwxr-xr-x 1 root  root  4096 Oct 31 00:00 ..' : '..');
            return (paths.length > 1 ? item + ':\n' : '') + names.join(flags.includes('l') ? '\n' : '  ');
          }).join('\n');
        } else if (cmd === 'cat') {
          if (!a.length) r.text = '使用例: cat README.txt';
          else r.text = a.map(item => { const p = this.path(item); if (!this.files.has(p)) throw new Error('cat: ' + item + ': ' + (this.dirs.has(p) ? 'Is a directory' : 'No such file')); return this.files.get(p); }).join('\n');
        } else if (cmd === 'bash' || cmd === 'sh' || cmd.startsWith('/') || cmd.startsWith('./') || cmd.startsWith('../')) {
          const name = cmd === 'bash' || cmd === 'sh' ? a[0] : cmd;
          if (!name) throw new Error('使用例: bash present.sh');
          const p = this.path(name);
          if (p !== this.scriptPath) throw new Error((this.files.has(p) ? 'このファイルは実行対象ではありません: ' : 'bash: No such executable: ') + name);
          r.text = '祝福データを確認しています...\n清楚は見つかりませんが、問題ありません。\nR1Qu3ur様、お誕生日おめでとう！\n\n荷物を受け取る準備ができました。';
          r.reward = true;
        } else if (cmd === 'clear') r.clear = true;
        else if (cmd === 'history') r.text = this.history.map((x,i) => `${i + 1}  ${x}`).join('\n');
        else if (cmd === 'whoami') r.text = 'guest';
        else if (cmd === 'hostname') r.text = 'birthday-prod-1031';
        else if (cmd === 'uname') r.text = a.length ? 'Linux birthday-prod-1031 5.14.0-427.el9.x86_64 x86_64 GNU/Linux' : 'Linux';
        else if (cmd === 'exit') r.text = '接続を維持しています。荷物を受け取ってからお帰りください。';
        else throw new Error('bash: ' + cmd + ': command not found（help で対応コマンドを確認できます）');
      } catch(e) { r.text = e.message; r.status = 1; }
      return r;
    }
    entry(p, flags) {
      const name = p.split('/').pop(); const dir = this.dirs.has(p);
      if (!flags.includes('l')) return name + (dir && flags.includes('F') ? '/' : '');
      return `${dir ? 'drwxr-xr-x' : p === this.scriptPath ? '-rwxr-xr-x' : '-rw-r--r--'} 1 ${p.startsWith('/home/guest') ? 'guest guest' : 'root  root '} ${String(dir ? 4096 : new TextEncoder().encode(this.files.get(p)).length).padStart(4)} Oct 31 00:00 ${name}`;
    }
  }
  scope.BirthdayShell = BirthdayShell;
  if (typeof module !== 'undefined' && module.exports) module.exports = BirthdayShell;
})(globalThis);
