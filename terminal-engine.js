/* A browser-local shell model. No host commands or network requests are executed. */
(function(scope){
  class BirthdayShell {
    constructor(){
      this.cwd='/home/guest';this.user='guest';this.restored=false;this.pending=null;this.history=[];
      this.dirs=new Set(['/','/home','/home/guest','/root','/tmp','/etc','/var','/var/log','/usr','/usr/bin']);
      this.files=new Map(Object.entries({
        '/home/guest/README.txt':'【障害調査依頼】\nプレゼント配送サービスが停止しました。\n\n1. systemctl status present\n2. journalctl -u present\n3. sudo systemctl restart present\n4. cat /home/guest/present.txt\n\n清楚サービスは復旧対象外です。\nhelp: 一覧 / help shell: 対応範囲',
        '/home/guest/present.txt':'配送停止中。systemctl status present で確認してください。',
        '/home/guest/quotes.txt':'lol民がカヌレなんか食うわけないだろ\n俺のヌクちゃんで抜けねえってのかよ\n俺は清楚を捨てる\nお前の〇ッチにぶっさしてやるよ\nわたしは幸せな人間が許せない\n好きすぎるだろ!!!',
        '/home/guest/.secret':'清楚はインストール時点で同梱されていませんでした。',
        '/etc/os-release':'NAME="Rocky Linux"\nVERSION="9.4 (Blue Onyx)"\nID="rocky"\nID_LIKE="rhel centos fedora"\nVERSION_ID="9.4"\nPRETTY_NAME="Rocky Linux 9.4 (Blue Onyx)"',
        '/etc/rocky-release':'Rocky Linux release 9.4 (Blue Onyx)',
        '/etc/hostname':'birthday-prod-1031',
        '/etc/hosts':'127.0.0.1 localhost\n192.0.2.31 birthday-prod-1031 birthday.local',
        '/etc/resolv.conf':'nameserver 192.0.2.1\nsearch birthday.local',
        '/etc/passwd':'root:x:0:0:root:/root:/bin/bash\nguest:x:1000:1000:Birthday Guest:/home/guest:/bin/bash',
        '/etc/motd':'Happy Birthday, R1Qu3ur!\n技術は令和、魂は平成。',
        '/var/log/birthday.log':'Oct 31 00:00:00 present[1031]: Starting delivery\nOct 31 00:00:01 present[1031]: ERROR: 配送担当者が名言集を読んでいます\nOct 31 00:00:02 seiso[31]: 俺は清楚を捨てる\nOct 31 00:00:03 present[1031]: HINT: sudo systemctl restart present'
      }));
      this.services=new Map(['present','seiso','sshd','NetworkManager','firewalld','crond'].map(n=>[n,{active:!['present','seiso'].includes(n),enabled:true}]));
      this.packages=new Set(['bash','coreutils','systemd','iproute','NetworkManager','firewalld','openssh-server','rocky-release']);
      this.available=new Set([...this.packages,'httpd','nginx','vim-enhanced','tree','curl','wget','bind-utils','net-tools','happiness']);
    }
    home(){return this.user==='root'?'/root':'/home/guest';}
    prompt(){return `[${this.user}@birthday-prod-1031 ${this.cwd===this.home()?'~':this.cwd.split('/').pop()||'/'}]${this.user==='root'?'#':'$'}`;}
    path(p='.'){
      if(p==='~'||p.startsWith('~/'))p=this.home()+p.slice(1);
      const out=[];for(const part of(p.startsWith('/')?p:this.cwd+'/'+p).split('/')){if(part==='..')out.pop();else if(part&&part!=='.')out.push(part);}return '/'+out.join('/');
    }
    fail(message){const e=new Error(message);e.shell=true;throw e;}
    writable(p,root){return root||p.startsWith('/tmp/')||p.startsWith('/home/guest/');}
    needRoot(root){if(!root)this.fail('Permission denied. sudo を付けて実行してください。');}
    read(p){const path=this.path(p);if(!this.files.has(path))this.fail('cat: '+p+': No such file');if(path==='/home/guest/present.txt'&&this.restored)return '配送経路を確保しました。\n受取先: present.html';return this.files.get(path);}
    tokenize(text){
      const tokens=[];let word='',quote='',started=false;
      const flush=()=>{if(started)tokens.push({v:word,op:false});word='';started=false;};
      for(let i=0;i<text.length;i++){
        const c=text[i];
        if(quote){if(c===quote)quote='';else if(c==='\\'&&quote==='"'&&i+1<text.length)word+=text[++i];else word+=c;continue;}
        if(c==='"'||c==="'"){quote=c;started=true;}
        else if(c==='\\'&&i+1<text.length){word+=text[++i];started=true;}
        else if(/\s/.test(c))flush();
        else if('|;&><'.includes(c)){flush();let op=c;if(text[i+1]===c&&'&|>'.includes(c))op+=text[++i];if(!['|',';','&&','||','>','>>'].includes(op))this.fail('未対応の演算子: '+op);tokens.push({v:op,op:true});}
        else{word+=c;started=true;}
      }
      if(quote)this.fail('bash: 引用符が閉じられていません。');flush();return tokens;
    }
    transact(action,names){for(const n of names){if(action==='remove')this.packages.delete(n);else this.packages.add(n);if(['nginx','httpd'].includes(n)){if(action==='remove')this.services.delete(n);else if(!this.services.has(n))this.services.set(n,{active:false,enabled:false});}}return names.map(n=>(action==='remove'?'Removed: ':'Installed: ')+n+'.x86_64').join('\n')+'\nComplete!';}
    run(text){
      const r={text:'',clear:false,reward:false,status:0};if(!text.trim())return r;this.history.push(text);
      try{
        if(this.pending){const p=this.pending;this.pending=null;r.text=/^y(es)?$/i.test(text.trim())?this.transact(p.action,p.names):'Operation aborted.';return r;}
        const segments=[];let current=[],connector=';';
        for(const t of this.tokenize(text)){if(t.op&&[';','&&','||'].includes(t.v)){if(!current.length)this.fail('bash: syntax error');segments.push({tokens:current,connector});current=[];connector=t.v;}else current.push(t);}
        if(current.length)segments.push({tokens:current,connector});else if(connector!==';')this.fail('bash: コマンドが必要です。');
        let status=0;const results=[];
        for(const seg of segments){
          if(seg.connector==='&&'&&status!==0||seg.connector==='||'&&status===0)continue;
          try{
            const pipeline=[];let args=[],redirect=null;
            for(let i=0;i<seg.tokens.length;i++){const t=seg.tokens[i];if(t.op&&t.v==='|'){if(!args.length)this.fail('bash: empty pipeline');pipeline.push(args);args=[];}else if(t.op&&['>','>>'].includes(t.v)){const target=seg.tokens[++i];if(!target||target.op||i!==seg.tokens.length-1)this.fail('リダイレクトは末尾に1つ指定してください。');redirect={append:t.v==='>>',path:this.path(target.v)};}else args.push(t.v);}
            if(!args.length)this.fail('bash: missing command');pipeline.push(args);let stdout='';
            for(let i=0;i<pipeline.length;i++)stdout=this.command(pipeline[i],i?stdout:null,r);
            if(redirect){const p=redirect.path;if(!this.writable(p,this.user==='root'))this.fail('bash: Permission denied: '+p);if(!this.dirs.has(p.slice(0,p.lastIndexOf('/'))||'/'))this.fail('bash: parent directory not found');if(this.dirs.has(p))this.fail('bash: Is a directory');this.files.set(p,(redirect.append?this.files.get(p)||'':'')+stdout+'\n');}else if(stdout)results.push(stdout);
            status=r.status;r.status=0;
          }catch(e){if(!e.shell)throw e;results.push(e.message);status=1;}
        }r.text=results.join('\n');r.status=status;
      }catch(e){if(!e.shell)throw e;r.text=e.message;r.status=1;}return r;
    }
    command(argv,stdin,r,sudo=false){
      const[cmd,...a]=argv,root=sudo||this.user==='root',flags=a.filter(x=>x.startsWith('-')).join(''),plain=a.filter(x=>!x.startsWith('-'));
      if(cmd==='sudo'){if(a[0]==='-i'||a[0]==='-s'||a.join(' ')==='su -'){this.user='root';this.cwd='/root';return '';}return a.length?this.command(a,stdin,r,true):'usage: sudo command / sudo -i';}
      switch(cmd){
        case 'help':return a[0]==='shell'?'対応: 引用符、|、grep、head/tail、>、>>、;、&&、||\n未対応: 実際のbash、変数展開、ワイルドカード、スクリプト実行、対話エディタ。\n変更はページ内だけ有効。再読み込みで初期化。ネットワーク応答も模擬出力です。':'調査: cat README.txt → systemctl status present → journalctl -u present\n復旧: sudo systemctl restart present → cat /home/guest/present.txt\n\nファイル: pwd cd ls cat less head tail grep find tree wc touch mkdir cp mv rm rmdir\nRocky: dnf yum rpm systemctl journalctl hostnamectl\nネットワーク: ip ss nmcli ping curl dig nslookup firewall-cmd\n情報: whoami id uname date uptime df free ps top history echo which\n操作: clear exit sudo -i / help shell\n\n例: cat /etc/os-release | grep NAME\n    mkdir -p /tmp/test && echo "happy birthday" > /tmp/test/message.txt';
        case 'clear':r.clear=true;return '';
        case 'pwd':return this.cwd;
        case 'cd':{const p=this.path(a[0]||this.home());if(!this.dirs.has(p))this.fail('cd: No such directory: '+p);if(p.startsWith('/root')&&!root)this.fail('cd: Permission denied');this.cwd=p;return '';}
        case 'ls':case 'tree':{
          const p=this.path(plain[0]||'.');if(this.files.has(p))return p.split('/').pop();if(!this.dirs.has(p))this.fail('ls: No such directory: '+p);
          const prefix=p==='/'?'/':p+'/';const entries=[...this.dirs,...this.files.keys()].filter(x=>x!==p&&x.startsWith(prefix)&&(cmd==='tree'||!x.slice(prefix.length).includes('/'))).filter(x=>flags.includes('a')||!x.split('/').pop().startsWith('.'));
          if(cmd==='tree')return p+'\n'+entries.map(x=>'  '.repeat(x.slice(prefix.length).split('/').length-1)+'├── '+x.split('/').pop()).join('\n');
          return entries.map(x=>flags.includes('l')?`${this.dirs.has(x)?'drwxr-xr-x':'-rw-r--r--'} 1 ${x.startsWith('/home/guest')||x.startsWith('/tmp')?'guest guest':'root  root '} ${String((this.files.get(x)||'').length).padStart(5)} Oct 31 00:00 ${x.split('/').pop()}`:x.split('/').pop()+(this.dirs.has(x)?'/':'')).join(flags.includes('l')?'\n':'  ');
        }
        case 'cat':case 'less':case 'head':case 'tail':{
          const paths=[...a];let n=10;const ni=paths.indexOf('-n');if(ni>=0){n=Number(paths[ni+1]);paths.splice(ni,2);if(!Number.isInteger(n)||n<0)this.fail('invalid line count');}
          const pp=paths.filter(x=>!x.startsWith('-'));const text=pp.length?pp.map(p=>this.read(p)).join('\n'):stdin??'';
          if(cmd==='head')return text.split('\n').slice(0,n).join('\n');if(cmd==='tail')return n===0?'':text.split('\n').slice(-n).join('\n');
          if(pp.some(p=>this.path(p)==='/home/guest/present.txt')&&this.restored)r.reward=true;return text;
        }
        case 'grep':{
          const p=[...plain],pattern=p.shift();if(pattern===undefined)this.fail('usage: grep [-inv] PATTERN [FILE]');const text=p.length?p.map(f=>this.read(f)).join('\n'):stdin??'';
          let regex;try{regex=new RegExp(pattern,flags.includes('i')?'i':'');}catch{this.fail('grep: invalid regular expression');}
          const lines=text.split('\n').map((line,i)=>({line,i})).filter(x=>regex.test(x.line)!==flags.includes('v'));if(!lines.length)r.status=1;return lines.map(x=>(flags.includes('n')?`${x.i+1}:`:'')+x.line).join('\n');
        }
        case 'wc':{const text=plain.length?plain.map(p=>this.read(p)).join('\n'):stdin??'';return flags.includes('l')?String(text.split('\n').length):`${text.split('\n').length} ${text.trim()?text.trim().split(/\s+/).length:0} ${text.length}`;}
        case 'find':{const p=this.path(plain[0]||'.'),idx=a.indexOf('-name'),pattern=idx>=0?a[idx+1]:null;const match=n=>!pattern||pattern.startsWith('*.')?(!pattern||n.endsWith(pattern.slice(1))):n===pattern;return [...this.dirs,...this.files.keys()].filter(x=>(x===p||x.startsWith(p==='/'?'/':p+'/'))&&match(x.split('/').pop())).join('\n');}
        case 'touch':case 'mkdir':{
          if(!plain.length)this.fail(cmd+': missing operand');for(const item of plain){const p=this.path(item);if(!this.writable(p,root))this.fail(cmd+': Permission denied');const parent=p.slice(0,p.lastIndexOf('/'))||'/';
            if(cmd==='mkdir'&&this.files.has(p)||cmd==='touch'&&this.dirs.has(p))this.fail(cmd+': conflicting file type');if(cmd==='mkdir'&&this.dirs.has(p)&&!flags.includes('p'))this.fail('mkdir: File exists');
            if(!this.dirs.has(parent)){if(cmd!=='mkdir'||!flags.includes('p'))this.fail(cmd+': parent directory not found');let current='';for(const part of p.split('/').filter(Boolean)){current+='/'+part;if(this.files.has(current))this.fail('mkdir: Not a directory');this.dirs.add(current);}}else if(cmd==='mkdir')this.dirs.add(p);
            if(cmd==='touch'&&!this.files.has(p))this.files.set(p,'');}return '';
        }
        case 'cp':case 'mv':{if(plain.length!==2)this.fail('usage: '+cmd+' SOURCE DEST');const from=this.path(plain[0]);let to=this.path(plain[1]);if(!this.files.has(from))this.fail(cmd+': source file not found (directory copying unsupported)');if(this.dirs.has(to))to+='/'+from.split('/').pop();if(!this.writable(to,root)||cmd==='mv'&&!this.writable(from,root))this.fail(cmd+': Permission denied');if(!this.dirs.has(to.slice(0,to.lastIndexOf('/'))||'/'))this.fail(cmd+': destination directory not found');if(from===to)this.fail(cmd+': same file');this.files.set(to,this.files.get(from));if(cmd==='mv')this.files.delete(from);return '';}
        case 'rm':case 'rmdir':{if(!plain.length)this.fail(cmd+': missing operand');for(const item of plain){const p=this.path(item);if(p==='/'||!this.writable(p,false))this.fail('思い出とシステム領域は削除できません。/tmp の練習用ファイルをお試しください。');if(!this.files.has(p)&&!this.dirs.has(p)){if(flags.includes('f'))continue;this.fail(cmd+': No such file');}const children=[...this.dirs,...this.files.keys()].filter(x=>x.startsWith(p+'/'));if(this.dirs.has(p)&&(cmd==='rmdir'&&children.length||cmd==='rm'&&!flags.includes('r')))this.fail(cmd+': directory not empty or -r required');if(flags.includes('r'))for(const x of children){this.files.delete(x);this.dirs.delete(x);}this.files.delete(p);this.dirs.delete(p);}return '';}
        case 'systemctl':{
          const action=plain[0]||'list-units';if(['list-units','list-unit-files'].includes(action)||a.includes('--failed'))return [...this.services].filter(([,s])=>!a.includes('--failed')||!s.active).map(([n,s])=>`${n}.service  ${action==='list-unit-files'?s.enabled?'enabled':'disabled':'loaded '+(s.active?'active running':'failed failed')}`).join('\n');
          if(action==='daemon-reload'){this.needRoot(root);return '';}
          const name=(plain[1]||'present').replace(/\.service$/,''),s=this.services.get(name);if(!s)this.fail('Unit '+name+'.service could not be found.');
          if(action==='status'){if(!s.active)r.status=3;return `● ${name}.service — ${name==='present'?'誕生日プレゼント配送':name==='seiso'?'清楚維持サービス':name}\n   Loaded: loaded (${s.enabled?'enabled':'disabled'})\n   Active: ${s.active?'active (running)':'failed'}\n   ${name==='seiso'?'Reason: 「俺は清楚を捨てる」':name==='present'&&!s.active?'Hint: journalctl -u present':'Main PID: 1031'}`;}
          if(action==='is-active'){if(!s.active)r.status=3;return s.active?'active':'inactive';}if(action==='is-enabled'){if(!s.enabled)r.status=1;return s.enabled?'enabled':'disabled';}
          if(action==='cat')return '[Unit]\nDescription='+name+'\n[Service]\nExecStart=/usr/bin/'+name+'\n[Install]\nWantedBy=multi-user.target';
          this.needRoot(root);if(!['start','stop','restart','reload','enable','disable'].includes(action))this.fail('systemctl: unsupported operation: '+action);
          if(name==='seiso'&&['start','restart'].includes(action))this.fail('Job for seiso.service failed: 本人の意思により復旧できません。');
          if(['enable','disable'].includes(action))s.enabled=action==='enable';if(['start','restart'].includes(action)||a.includes('--now')&&action==='enable')s.active=true;if(action==='stop'||a.includes('--now')&&action==='disable')s.active=false;
          this.restored=this.services.get('present').active;return name==='present'&&s.active?'[OK] present.service を起動しました。\n[OK] 清楚への依存関係を解除しました。\n次のコマンド: cat /home/guest/present.txt':'';
        }
        case 'journalctl':{const idx=a.indexOf('-u'),unit=idx>=0?(a[idx+1]||'').replace(/\.service$/,''):'';let text=unit==='r1qu3ur'?this.files.get('/home/guest/quotes.txt').split('\n').map(q=>'[r1qu3ur] '+q).join('\n'):unit&&!this.services.has(unit)?'-- No entries --':this.files.get('/var/log/birthday.log')+(this.restored?'\nOct 31 00:00:31 present[1031]: Started Birthday Present Delivery.':'');const ni=a.indexOf('-n');if(ni>=0)text=text.split('\n').slice(-Math.max(1,Number(a[ni+1])||10)).join('\n');return text;}
        case 'dnf':case 'yum':{
          const action=plain[0],names=plain.slice(1);
          if(action==='repolist')return 'repo id      repo name\nbaseos       Rocky Linux 9 - BaseOS\nappstream    Rocky Linux 9 - AppStream\nextras       Rocky Linux 9 - Extras';
          if(action==='list')return [...(names[0]==='available'?this.available:this.packages)].map(n=>n+'.x86_64  1.0-1.el9  '+(this.packages.has(n)?'@baseos':'appstream')).join('\n');
          if(action==='search')return [...this.available].filter(n=>n.includes(names[0]||'')).join('\n')||'No matches found.';
          if(action==='info')return names.map(n=>this.available.has(n)?`Name: ${n}\nArchitecture: x86_64\nVersion: 1.0\nRepository: ${this.packages.has(n)?'@System':'appstream'}`:'No matching package: '+n).join('\n');
          if(['update','upgrade','check-update'].includes(action))return 'Last metadata expiration check: 0:00:31 ago.\nDependencies resolved.\nNothing to do.\nComplete!';
          if(action==='clean'||action==='makecache'){this.needRoot(root);return 'Metadata cache refreshed.';}
          if(['install','remove','reinstall'].includes(action)){this.needRoot(root);if(!names.length)this.fail('dnf: package name required');for(const n of names)if(!this.available.has(n)||action==='remove'&&!this.packages.has(n))this.fail('No match for argument: '+n);if(a.includes('-y')||a.includes('--assumeyes'))return this.transact(action,names);this.pending={action,names};return 'Dependencies resolved.\n'+names.join(', ')+'\nIs this ok [y/N]:';}
          return 'usage: dnf install|remove|list|search|info|repolist|update [package]';
        }
        case 'rpm':return a.includes('-qa')?[...this.packages].map(n=>n+'-1.0-1.el9.x86_64').join('\n'):a.includes('-q')?plain.map(n=>this.packages.has(n)?n+'-1.0-1.el9.x86_64':'package '+n+' is not installed').join('\n'):'usage: rpm -qa / rpm -q PACKAGE';
        case 'ip':{if(plain.includes('set')||plain.includes('add')||plain.includes('del'))this.fail('ip: 表示操作のみ対応しています。');const sub=plain[0]||'addr';if(['r','route'].includes(sub))return 'default via 192.0.2.1 dev ens33 proto static\n192.0.2.0/24 dev ens33 proto kernel scope link src 192.0.2.31';if(['n','neigh'].includes(sub))return '192.0.2.1 dev ens33 lladdr 00:50:56:10:31:01 REACHABLE';return ['l','link'].includes(sub)?'1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n2: ens33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500':'1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n    inet 127.0.0.1/8 scope host lo\n2: ens33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n    inet 192.0.2.31/24 scope global ens33';}
        case 'ss':return 'State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process\n'+(this.services.get('sshd').active?'LISTEN 0      128    0.0.0.0:22         0.0.0.0:*       sshd\n':'')+(this.restored?'LISTEN 0      128    127.0.0.1:1031     0.0.0.0:*       present\n':'')+[...this.services].filter(([n,s])=>['httpd','nginx'].includes(n)&&s.active).map(([n])=>'LISTEN 0      511    0.0.0.0:80         0.0.0.0:*       '+n).join('\n');
        case 'nmcli':return a.includes('connection')||a.includes('con')?'NAME   UUID                                  TYPE      DEVICE\nens33  10311031-1031-4031-8031-103110311031  ethernet  ens33':'DEVICE  TYPE      STATE      CONNECTION\nens33   ethernet  connected  ens33\nlo      loopback  unmanaged  --';
        case 'firewall-cmd':return a.includes('--state')?this.services.get('firewalld').active?'running':'not running':a.includes('--list-all')?'public (active)\n  interfaces: ens33\n  services: ssh dhcpv6-client\n  ports: 1031/tcp':'対応: firewall-cmd --state / --list-all';
        case 'ping':{const host=plain.at(-1)||'birthday.local';if(!['birthday.local','localhost','127.0.0.1','192.0.2.31'].includes(host)){r.status=2;return 'ping: '+host+': Name or service not known (模擬ネットワーク内)';}return `PING ${host} (192.0.2.31) 56(84) bytes of data.\n64 bytes: icmp_seq=1 ttl=64 time=0.31 ms\n64 bytes: icmp_seq=2 ttl=64 time=0.31 ms\n--- ${host} ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss`;}
        case 'curl':return flags.includes('I')?'HTTP/1.1 200 OK\nServer: birthday/10.31\nContent-Type: text/plain':'Happy Birthday, R1Qu3ur!\n※ブラウザ内の模擬応答です。外部通信は行いません。';
        case 'dig':case 'nslookup':return 'Server: 192.0.2.1\nName: birthday.local\nAddress: 192.0.2.31\n; 模擬DNS応答';
        case 'whoami':return root?'root':this.user;
        case 'id':return root?'uid=0(root) gid=0(root) groups=0(root)':'uid=1000(guest) gid=1000(guest) groups=1000(guest),10(wheel)';
        case 'hostname':return 'birthday-prod-1031';
        case 'hostnamectl':return ' Static hostname: birthday-prod-1031\n Operating System: Rocky Linux 9.4 (Blue Onyx)\n Kernel: Linux 5.14.0-427.el9.x86_64\n Architecture: x86-64';
        case 'uname':return a.length?'Linux birthday-prod-1031 5.14.0-427.el9.x86_64 #1 SMP x86_64 GNU/Linux':'Linux';
        case 'date':return new Date().toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})+' JST';
        case 'uptime':return '00:10:31 up ✖✖ years, 1 user, load average: 0.31, 0.10, 0.03';
        case 'df':return 'Filesystem          Size Used Avail Use% Mounted on\n/dev/mapper/rl-root   70G  12G   58G 18% /\n/dev/memories       100G  99G    1G 99% /思い出\n/dev/seiso            0B   0B    0B  -- /清楚';
        case 'free':return '               total        used        free      shared  buff/cache   available\nMem:           7.7Gi       1.0Gi       5.8Gi        31Mi       0.9Gi       6.4Gi\nSwap:          2.0Gi          0B       2.0Gi';
        case 'ps':case 'top':return (cmd==='top'?'top - 00:10:31 up ✖✖ years (1回分のスナップショット)\n':'')+'USER  PID %CPU %MEM COMMAND\nroot    1  0.0  0.1 /usr/lib/systemd/systemd\nroot   31  0.0  0.1 /usr/sbin/sshd\nguest 100  0.0  0.1 -bash'+(this.restored?'\nguest 1031 0.0 0.1 /usr/bin/deliver-present':'');
        case 'history':return this.history.map((line,i)=>`${String(i+1).padStart(4)}  ${line}`).join('\n');
        case 'echo':return a.join(' ');
        case 'which':return plain.map(n=>['ls','cat','bash','systemctl','dnf','ip','ss','grep','curl'].includes(n)?'/usr/bin/'+n:'which: no '+n).join('\n');
        case 'man':return '対応コマンド: help ／ シェルの制約: help shell';
        case 'exit':case 'logout':if(this.user==='root'){this.user='guest';this.cwd='/home/guest';return 'logout';}return '本日のオンコールは終了できません。祝福を受領してください。';
        case 'reboot':case 'shutdown':this.needRoot(root);return '再起動を保留しました。今日は人生を再起動せず、祝われてください。';
        case 'vi':case 'vim':case 'nano':return '対話エディタは未対応です。echo "本文" > ファイル で仮想ファイルを作成できます。';
        default:this.fail('bash: '+cmd+': command not found\nhelp で対応コマンドを確認できます。');
      }
    }
  }
  scope.BirthdayShell=BirthdayShell;
  if(typeof module!=='undefined'&&module.exports)module.exports=BirthdayShell;
})(typeof globalThis!=='undefined'?globalThis:window);
