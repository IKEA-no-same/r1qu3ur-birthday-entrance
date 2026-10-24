(() => {
  const shell = new BirthdayShell();
  const output = document.getElementById('output');
  const input = document.getElementById('command');
  const viewport = document.getElementById('terminalViewport');
  const scroll = () => { viewport.scrollTop = viewport.scrollHeight; };
  let index = 0, draft = '', rewardShown = false;
  function print(text, type = '') {
    if (!text) return;
    const line = document.createElement('div');
    line.className = 'line ' + type;
    line.textContent = text;
    output.append(line);
    while (output.children.length > 240) output.firstElementChild.remove();
    scroll();
  }
  function execute(raw) {
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
    scroll();
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
      const options = shell.complete(input.value);
      if (options.length) { event.preventDefault(); if (options.length === 1) input.value = options[0]; else { print(shell.prompt() + ' ' + input.value); print(options.join('  ')); } }
    } else if (event.ctrlKey && event.key.toLowerCase() === 'l') { event.preventDefault(); output.replaceChildren(); rewardShown = false; }
    else if (event.ctrlKey && event.key.toLowerCase() === 'c') { if (!window.getSelection()?.toString()) { event.preventDefault(); print(shell.prompt() + ' ' + input.value + '^C'); input.value = ''; shell.pending = null; } }
  });
  document.getElementById('prompt').textContent = shell.prompt();
  print('Rocky Linux 9.4 (Blue Onyx)\nLast login: Oct 31 00:00:00 from VRChat\n\nR1Qu3ur様\n/usr/local/etc にある present.sh を実行してください。\n荷物をご用意しております。\n\n操作が分からない場合は help を入力してください。\n');
  viewport.addEventListener('click', event => {
    if (!event.target.closest('a,button,input') && !window.getSelection()?.toString()) input.focus();
  });
})();
