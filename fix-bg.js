const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'artifacts/reels-app/src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(srcDir, function(filePath) {
  if (filePath.endsWith('.tsx') && !filePath.includes('ReelPlayer.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace inline black backgrounds
    content = content.replace(/style={{[^}]*background:\s*'#000'[^}]*}}/g, '');
    content = content.replace(/style={{[^}]*background:\s*'rgba\(0,0,0,0\.96\)'[^}]*}}/g, 'className="bg-background/95 backdrop-blur-md border-b border-border"');
    
    // Replace hardcoded classes globally
    content = content.replace(/bg-black/g, 'bg-background');
    content = content.replace(/text-white(\/[0-9]+)?/g, (match) => {
        if (match === 'text-white') return 'text-foreground';
        return 'text-muted-foreground';
    });
    content = content.replace(/border-white(\/[0-9]+)?/g, 'border-border');
    content = content.replace(/bg-white\/[0-9]+/g, 'bg-muted');

    // Fix specific ExplorePage inline styles
    content = content.replace(/style={{ background: '#000' }}/g, '');
    content = content.replace(/style={{ background: 'rgba\\(0,0,0,0\\.96\\)', backdropFilter: 'blur\\(14px\\)', borderBottom: '1px solid rgba\\(255,255,255,0\\.07\\)' }}/g, 'className="bg-background/95 backdrop-blur-md border-b border-border"');
    content = content.replace(/style={{ background: 'rgba\\(255,255,255,0\\.07\\)', border: '1px solid rgba\\(255,255,255,0\\.10\\)' }}/g, 'className="bg-muted border border-border"');
    content = content.replace(/style={{ background: 'rgba\\(255,255,255,0\\.04\\)', border: '1px solid rgba\\(255,255,255,0\\.08\\)' }}/g, 'className="bg-muted border border-border"');
    content = content.replace(/style={{ border: '2px solid rgba\\(255,255,255,0\\.12\\)' }}/g, 'className="border-2 border-border"');
    content = content.replace(/style={{ background: '#0095f6' }}/g, 'className="bg-primary"');
    
    // Fix tabs in ExplorePage
    content = content.replace(/background: tab === id \? '#0095f6' : 'rgba\\(255,255,255,0\\.07\\)'/g, "background: tab === id ? 'var(--color-primary)' : 'var(--color-muted)'");
    content = content.replace(/color: tab === id \? '#fff' : 'rgba\\(255,255,255,0\\.5\\)'/g, "color: tab === id ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)'");
    content = content.replace(/border: tab === id \? 'none' : '1px solid rgba\\(255,255,255,0\\.10\\)'/g, "border: tab === id ? 'none' : '1px solid var(--color-border)'");

    // Fix Follow button
    content = content.replace(/background: user.isFollowing \? 'rgba\\(255,255,255,0\\.08\\)' : '#0095f6'/g, "background: user.isFollowing ? 'var(--color-muted)' : 'var(--color-primary)'");
    content = content.replace(/border: user.isFollowing \? '1px solid rgba\\(255,255,255,0\\.15\\)' : 'none'/g, "border: user.isFollowing ? '1px solid var(--color-border)' : 'none'");
    content = content.replace(/color: 'white'/g, "color: user.isFollowing ? 'var(--color-foreground)' : 'var(--color-primary-foreground)'");
    
    // Message button
    content = content.replace(/style={{ background: 'rgba\\(255,255,255,0\\.06\\)', border: '1px solid rgba\\(255,255,255,0\\.10\\)' }}/g, 'className="bg-muted border border-border"');

    // Remove empty classNames or merge them later if necessary, but this regex replacement should be enough.

    if (original !== content) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
