let libraries = [];
let activeLibIndex = -1;
let currentContacts = [];
let filteredContacts = [];
let renderedCount = 0;
const CHUNK_SIZE = 100;
let listObserver = null;

window.onload = function() {
    fetch('scan.php')
        .then(res => res.json())
        .then(files => {
            if(files.length > 0) loadFiles(files);
            else document.getElementById('libraryList').innerHTML = `<div class="empty-state">No contacts files found on server.</div>`;
        })
        .catch(err => console.error("PHP Scan Error:", err));
};

function changeView(viewName) {
    document.body.className = `view-${viewName}`;
}

function loadFiles(fileList) {
    let promises = fileList.map(fileName => {
        return fetch(fileName)
            .then(res => res.text())
            .then(content => {
                let type = fileName.toLowerCase().endsWith('.csv') ? 'CSV' : 'VCF';
                let contacts = (type === 'CSV') ? parseCSV(content) : parseVCF(content);
                
                if(contacts.length > 0) {
                    return { name: fileName, type: type, contacts: contacts };
                }
                return null;
            });
    });

    Promise.all(promises).then(results => {
        libraries = results.filter(r => r !== null).sort((a,b) => a.name.localeCompare(b.name));
        renderLibraries();
    });
}

function parseCSV(content) {
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    const rawLines = content.split(/\r\n|\n/);
    const lines = [];
    let buffer = '';
    
    for (let line of rawLines) {
        buffer += (buffer ? '\n' : '') + line;
        if ((buffer.match(/"/g) || []).length % 2 === 0) {
            if (buffer.trim()) lines.push(buffer);
            buffer = '';
        }
    }
    
    if (lines.length < 2) return [];

    const splitLine = (text) => {
        let res = [], curr = '', inQ = false;
        for (let i = 0; i < text.length; i++) {
            let c = text[i];
            if (c === '"') {
                if (inQ && text[i + 1] === '"') { curr += '"'; i++; } 
                else inQ = !inQ;
            } else if (c === ',' && !inQ) {
                res.push(curr); curr = '';
            } else curr += c;
        }
        res.push(curr);
        return res;
    };

    const headers = splitLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
    const findCol = (candidates) => {
        const lowerHeaders = headers.map(h => h.toLowerCase());
        for (let c of candidates) {
            const idx = lowerHeaders.indexOf(c.toLowerCase());
            if (idx > -1) return idx;
        }
        return -1;
    };

    const iFirst = findCol(['First Name', 'Given Name', 'First']);
    const iLast = findCol(['Last Name', 'Family Name', 'Last']);
    const iOrg = findCol(['Organization Name', 'Company', 'Organization', 'Work']);
    const iTitle = findCol(['Job Title', 'Title', 'Role']);
    const iNote = findCol(['Notes', 'Note', 'Comment']);
    const iPhoto = findCol(['Photo', 'Avatar', 'Image', 'Picture', 'Profile Picture']);

    return lines.slice(1).map(line => {
        const row = splitLine(line);
        if (!row || row.length === 0) return null;
        let fn = `${row[iFirst] || ''} ${row[iLast] || ''}`.trim();
        if (!fn && iOrg > -1) fn = row[iOrg];
        if (!fn) return null;

        let contact = {
            display: { 
                fn, 
                tel: [], 
                email: [], 
                extras: [], 
                org: row[iOrg] || '', 
                title: row[iTitle] || '', 
                note: row[iNote] || '', 
                photo: row[iPhoto] || '',
                adr: '' 
            }
        };

        headers.forEach((h, i) => {
            if (!row[i]) return;
            const val = row[i].trim();
            if (!val) return;
            const lowerH = h.toLowerCase();
            
            if (lowerH.includes('type') || lowerH.includes('label') || lowerH.includes('category')) return;

            const values = val.split(':::').map(v => v.trim()).filter(v => v);

            if (lowerH.includes('phone') || lowerH.includes('mobile') || lowerH.includes('tel')) {
                values.forEach(v => {
                    if (/\d/.test(v)) {
                        contact.display.tel.push({ number: v, type: 'Mobile' });
                    }
                });
            }
            else if (lowerH.includes('email') || lowerH.includes('mail')) {
                values.forEach(v => {
                    if (v.includes('@')) {
                        contact.display.email.push({ email: v, type: 'Home' });
                    }
                });
            }
            else if (lowerH.includes('address') || lowerH.includes('street') || lowerH.includes('location')) {
                if (contact.display.adr) {
                    if (!contact.display.adr.includes(val)) contact.display.adr += ', ' + val;
                }
                else contact.display.adr = val;
            }
            else if (lowerH.includes('url') || lowerH.includes('website') || lowerH.includes('link')) {
                values.forEach(v => {
                    if (v.includes('.') || v.startsWith('http')) {
                        contact.display.extras.push({ label: 'Website', value: v });
                    }
                });
            }
        });

        return contact;
    }).filter(Boolean);
}

function parseVCF(content) {
    const unfolded = content.replace(/\r\n /g, "").replace(/\n /g, "").replace(/=\r\n/g, "");
    const cards = unfolded.split(/BEGIN:VCARD/i).slice(1);
    
    return cards.map(cardRaw => {
        const cardLines = cardRaw.split(/\r\n|\n/);
        const contact = { display: { tel:[], email:[], extras:[] } };
        let itemLabels = {};

        cardLines.forEach(line => {
            if(line.includes('X-ABLabel')) {
                let [keyPart, ...valParts] = line.split(':');
                let groupMatch = keyPart.match(/item\d+/);
                if(groupMatch) itemLabels[groupMatch[0]] = valParts.join(':').replace(/_\$!<|>\!\$_/g, '');
            }
        });

        cardLines.forEach(line => {
            if(!line.includes(':')) return;
            let [keyPart, ...valParts] = line.split(':');
            let val = valParts.join(':').trim();
            let [fullKey, ...params] = keyPart.split(';');
            let groupMatch = fullKey.match(/item\d+/);
            let label = groupMatch ? itemLabels[groupMatch[0]] : null;
            let cleanKey = fullKey.replace(/item\d+\./, "").toUpperCase();

            if(cleanKey === 'FN') contact.display.fn = val;
            else if(cleanKey === 'TEL') contact.display.tel.push({ number: val, type: label || 'MOBILE' });
            else if(cleanKey === 'EMAIL') contact.display.email.push({ email: val, type: label || 'WORK' });
            else if(cleanKey === 'ORG') contact.display.org = val.replace(/;/g, ' ').trim();
            else if(cleanKey === 'TITLE') contact.display.title = val;
            else if(cleanKey === 'NOTE') contact.display.note = val.replace(/\\n/g, '\n');
            else if(cleanKey === 'PHOTO') contact.display.photo = val;
            else if(cleanKey === 'ADR') contact.display.adr = val.replace(/\\n/g, ', ').replace(/;/g, ' ').trim();
            else if(cleanKey === 'URL') contact.display.extras.push({ label: label || 'Website', value: val });
        });
        return contact;
    }).sort((a,b) => (a.display.fn||"").localeCompare(b.display.fn||""));
}

function renderLibraries() {
    const container = document.getElementById('libraryList');
    container.innerHTML = '';
    libraries.forEach((lib, idx) => {
        const div = document.createElement('div');
        div.className = `library-item ${idx === activeLibIndex ? 'active' : ''}`;
        div.innerHTML = `
            <div class="lib-info">
                <div class="lib-name">${lib.name.replace(/\.(vcf|csv)$/i, '')}</div>
                <div class="lib-count">${lib.contacts.length} Contacts</div>
            </div>
            <div class="lib-type">${lib.type}</div>
        `;
        div.onclick = () => selectLibrary(idx);
        container.appendChild(div);
    });
}

function selectLibrary(idx) {
    activeLibIndex = idx;
    currentContacts = libraries[idx].contacts;
    filteredContacts = currentContacts;
    document.getElementById('listTitle').innerText = libraries[idx].name.split('.')[0];
    document.getElementById('searchInput').value = '';
    renderLibraries();
    initVirtualList();
    changeView('list');
}

function initVirtualList() {
    const listEl = document.getElementById('contactList');
    listEl.innerHTML = '';
    renderedCount = 0;
    
    const sentinel = document.createElement('div');
    sentinel.id = 'listSentinel';
    sentinel.style.height = '20px';
    sentinel.style.width = '100%';
    
    if(listObserver) listObserver.disconnect();

    listObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            renderNextChunk();
        }
    }, { root: document.querySelector('.contact-scroll-area'), threshold: 0.1 });

    renderAlphaJumper();
    renderNextChunk();
    listEl.appendChild(sentinel);
    listObserver.observe(sentinel);
}

function renderNextChunk() {
    const listEl = document.getElementById('contactList');
    const sentinel = document.getElementById('listSentinel');
    
    const chunk = filteredContacts.slice(renderedCount, renderedCount + CHUNK_SIZE);
    if (chunk.length === 0) return;

    const fragment = document.createDocumentFragment();
    chunk.forEach((c, i) => {
        const globalIdx = renderedCount + i;
        const item = createContactNode(c, globalIdx);
        fragment.appendChild(item);
    });

    listEl.insertBefore(fragment, sentinel);
    renderedCount += chunk.length;
}

function createContactNode(c, index) {
    let name = c.display.fn || "Unknown Contact";
    const item = document.createElement('div');
    item.className = 'contact-item';
    item.id = `idx-${index}`;
    item.innerHTML = `
        ${getAvatar(name, c.display.photo, false)}
        <div class="c-info">
            <div class="c-name">${name}</div>
            <div class="c-sub">${c.display.org || (c.display.tel[0]?.number || "No information")}</div>
        </div>
    `;
    item.onclick = () => {
        document.querySelectorAll('.contact-item').forEach(x => x.classList.remove('active'));
        item.classList.add('active');
        renderDetail(c);
        changeView('detail');
    };
    return item;
}

function renderAlphaJumper() {
    const jumpEl = document.getElementById('alphaJumper');
    jumpEl.innerHTML = '';
    let chars = new Set();
    filteredContacts.forEach((c, i) => {
        let name = c.display.fn || "Unknown Contact";
        let char = name.charAt(0).toUpperCase().replace(/[^A-Z]/, '#');
        if(!chars.has(char)) {
            chars.add(char);
            let jd = document.createElement('div');
            jd.className = 'alpha-char';
            jd.innerText = char;
            jd.onclick = () => jumpToAlpha(i);
            jumpEl.appendChild(jd);
        }
    });
}

function jumpToAlpha(index) {
    if (index >= renderedCount) {
        renderedCount = index;
        renderNextChunk();
    }
    const target = document.getElementById(`idx-${index}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderDetail(c) {
    const container = document.getElementById('detailContent');
    let d = c.display;
    window.currentContact = c;

    let html = `
        <div class="hero-section animate-in">
            ${getAvatar(d.fn, d.photo, true)}
            <div class="hero-name">${d.fn || "Unknown"}</div>
            <div class="hero-org">${d.title ? d.title + ' • ' : ''}${d.org || ''}</div>
            <div class="hero-actions">
                <button class="hero-btn" onclick="shareAsVCF()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg> Share</button>
                <button class="hero-btn" onclick="copyFullCard()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy All</button>
            </div>
        </div>
    `;

    const COPY_JS = "copyTxt(this.closest('.info-row').querySelector('.info-value').innerText)";

    if(d.tel && d.tel.length) {
        html += `<div class="info-group">`;
        d.tel.forEach(t => {
            let clean = t.number.replace(/[^0-9+]/g, '');
            let isWa = t.type?.toUpperCase().includes('WHATSAPP');
            html += generateRow('Phone', t.number, t.type || 'CELL', [
                {icon:'call', action:`window.open('tel:${clean}')`},
                (isWa || clean.startsWith('+') ? {icon:'wa', action:`window.open('https://wa.me/${clean.replace('+','')}')`} : null),
                {icon:'copy', action: COPY_JS}
            ]);
        });
        html += `</div>`;
    }

    if(d.email && d.email.length) {
        html += `<div class="info-group">`;
        d.email.forEach(e => {
            html += generateRow('Email', e.email, e.type || 'WORK', [
                {icon:'mail', action:`window.open('mailto:${e.email}')`},
                {icon:'copy', action: COPY_JS}
            ]);
        });
        html += `</div>`;
    }

    if(d.adr) {
        html += `<div class="info-group">${generateRow('Address', d.adr, 'HOME', [{icon:'copy', action: COPY_JS}])}</div>`;
    }
    
    if(d.note || (d.extras && d.extras.length)) {
        html += `<div class="info-group">`;
        if(d.extras) {
            d.extras.forEach(x => html += generateRow(x.label, x.value, 'LINK', [{icon:'copy', action: COPY_JS}]))
        }
        if(d.note) {
            html += generateRow('Notes', d.note, '', [{icon:'copy', action: COPY_JS}]);
        }
        html += `</div>`;
    }

    container.innerHTML = html;
}

function getAvatar(name, photo, isHero) {
    let sizeClass = isHero ? 'hero-avatar' : 'avatar-circle';
    let initials = name.split(' ').filter(x => x).map(n => n[0]).join('').substr(0,2).toUpperCase() || '?';
    
    let photoSrc = null;
    if(photo && photo.trim().length > 0) {
        let p = photo.trim();
        if(p.startsWith('http') || p.startsWith('data:')) {
            photoSrc = p;
        } else if (/^[A-Za-z0-9+/=]+$/.test(p) && p.length > 100) {
            photoSrc = `data:image/jpeg;base64,${p}`;
        }
    }

    return `
        <div class="${sizeClass}">
            ${photoSrc ? `<img src="${photoSrc}" onerror="this.style.display='none'; this.parentElement.innerText='${initials}'">` : initials}
        </div>`;
}

function generateRow(label, val, type, actions) {
    const svgs = {
        call: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>',
        wa: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>',
        mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline>',
        copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>'
    };

    let btns = actions.filter(a=>a).map(a => `<button class="icon-btn" onclick="${a.action}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${svgs[a.icon]}</svg></button>`).join('');

    return `
    <div class="info-row">
        <div class="info-content">
            <div class="info-label">${label}</div>
            <div class="info-value">${val}</div>
            ${type ? `<div class="info-meta"><span class="info-type">${type}</span></div>` : ''}
        </div>
        <div class="action-btns">${btns}</div>
    </div>`;
}

function fuzzySearch(text, query) {
    if (!query) return true;
    query = query.toLowerCase().replace(/\s/g, '');
    text = text.toLowerCase();
    let n = -1;
    for (let char of query) {
        if (!~(n = text.indexOf(char, n + 1))) return false;
    }
    return true;
}

function filterContacts() {
    const q = document.getElementById('searchInput').value.trim();
    if (!q) {
        filteredContacts = currentContacts;
    } else {
        filteredContacts = currentContacts.filter(c => 
            fuzzySearch(c.display.fn || "", q) || 
            fuzzySearch(c.display.org || "", q)
        );
    }
    initVirtualList();
}

function copyTxt(t) {
    navigator.clipboard.writeText(t).then(() => {
        const toast = document.getElementById('toast');
        toast.style.opacity = 1;
        setTimeout(() => toast.style.opacity = 0, 2000);
    });
}

function copyFullCard() {
    const c = window.currentContact;
    let txt = `Name: ${c.display.fn}\nOrg: ${c.display.org}\n`;
    c.display.tel.forEach(t => txt += `Phone (${t.type}): ${t.number}\n`);
    c.display.email.forEach(e => txt += `Email (${e.type}): ${e.email}\n`);
    if(c.display.adr) txt += `Address: ${c.display.adr}\n`;
    if(c.display.note) txt += `Notes: ${c.display.note}\n`;
    copyTxt(txt);
}

async function shareAsVCF() {
    const c = window.currentContact;
    const vcf = `BEGIN:VCARD
VERSION:3.0
FN:${c.display.fn || ''}
ORG:${c.display.org || ''}
TITLE:${c.display.title || ''}
${c.display.tel.map(t => `TEL;TYPE=${t.type.replace(/\s/g,'')}:${t.number}`).join('\n')}
${c.display.email.map(e => `EMAIL;TYPE=${e.type.replace(/\s/g,'')}:${e.email}`).join('\n')}
ADR;TYPE=HOME:;;${c.display.adr || ''};;;;
NOTE:${(c.display.note || '').replace(/\n/g, '\\n')}
END:VCARD`;

    const blob = new Blob([vcf], { type: 'text/vcard' });
    const fileName = `${(c.display.fn || 'contact').replace(/\s/g, '_')}.vcf`;

    if (navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: 'text/vcard' })] })) {
        try {
            await navigator.share({
                files: [new File([blob], fileName, { type: 'text/vcard' })],
                title: c.display.fn,
                text: 'Sharing contact from Contacts Hub'
            });
        } catch (e) {
            if(e.name !== 'AbortError') downloadVCF(blob, fileName);
        }
    } else {
        downloadVCF(blob, fileName);
    }
}

function downloadVCF(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}