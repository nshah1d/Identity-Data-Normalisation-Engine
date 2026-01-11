let libraries = [];
let activeLibIndex = -1;
let currentContacts = [];

window.onload = function() {
    fetch('scan.php')
        .then(res => res.json())
        .then(files => {
            if(files.length > 0) loadFiles(files);
            else document.getElementById('libraryList').innerHTML = `<div style="padding:20px; color:#d9534f; font-size:12px; text-align:center">No .vcf/.csv files found.</div>`;
        })
        .catch(err => console.error("PHP Scan Error:", err));
};

function loadFiles(fileList) {
    let loadedCount = 0;
    fileList.forEach(fileName => {
        fetch(fileName)
            .then(res => res.text())
            .then(content => {
                let type = fileName.toLowerCase().endsWith('.csv') ? 'CSV' : 'VCF';
                let contacts = (type === 'CSV') ? parseCSV(content) : parseVCF(content);
                
                if(contacts.length > 0) {
                    libraries.push({ name: fileName, type: type, contacts: contacts });
                    libraries.sort((a,b) => a.name.localeCompare(b.name));
                    renderLibraries();
                    
                    if(activeLibIndex === -1) selectLibrary(0);
                }
                loadedCount++;
            });
    });
}

function parseCSV(content) {
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }

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

    const iFirst  = findCol(['First Name', 'Given Name', 'First']);
    const iMiddle = findCol(['Middle Name', 'Additional Name', 'Middle']);
    const iLast   = findCol(['Last Name', 'Family Name', 'Last', 'Surname']);
    const iPrefix = findCol(['Name Prefix', 'Prefix']);
    const iSuffix = findCol(['Name Suffix', 'Suffix']);

    let iOrg   = findCol(['Organization Name', 'Company', 'Organization 1 - Name']);
    let iTitle = findCol(['Organization Title', 'Job Title', 'Title', 'Organization 1 - Title']);
    let iNote  = findCol(['Notes', 'Note']);
    let iBday  = findCol(['Birthday']);
    let iPhoto = findCol(['Photo']);

    return lines.slice(1).map(line => {
        const row = splitLine(line);
        if (!row || row.length === 0) return null;

        let nameParts = [];
        if (iPrefix > -1 && row[iPrefix]) nameParts.push(row[iPrefix]);
        if (iFirst > -1  && row[iFirst])  nameParts.push(row[iFirst]);
        if (iMiddle > -1 && row[iMiddle]) nameParts.push(row[iMiddle]);
        if (iLast > -1   && row[iLast])   nameParts.push(row[iLast]);
        if (iSuffix > -1 && row[iSuffix]) nameParts.push(row[iSuffix]);

        let fn = nameParts.join(' ').trim();
        if (!fn && iOrg > -1 && row[iOrg]) fn = row[iOrg];
        if (!fn) fn = "Unknown";

        let contact = {
            display: {
                fn: fn,
                tel: [],
                email: [],
                extras: [],
                org: (iOrg > -1) ? row[iOrg] : '',
                title: (iTitle > -1) ? row[iTitle] : '',
                note: (iNote > -1) ? row[iNote] : '',
                bday: (iBday > -1) ? row[iBday] : '',
                photo: (iPhoto > -1) ? row[iPhoto] : ''
            }
        };

        headers.forEach((h, i) => {
            if (!row[i]) return;
            const lowerH = h.toLowerCase();
            const rawValue = row[i];

            if (lowerH.includes('phone') && lowerH.includes('value')) {
                let typeH = h.replace(/Value/i, 'Type').replace(/value/i, 'Label'); 
                let typeIdx = headers.indexOf(typeH);
                if(typeIdx === -1) {
                    if (headers[i-1] && headers[i-1].toLowerCase().includes('label')) typeIdx = i-1;
                }
                
                let type = (typeIdx > -1) ? row[typeIdx] : 'Mobile';
                type = type.replace(/[*]/g, '').trim() || 'Mobile';

                if (rawValue) {
                    const numbers = rawValue.includes(':::') ? rawValue.split(':::') : [rawValue];
                    numbers.forEach(num => {
                        if (num.trim()) contact.display.tel.push({ number: num.trim(), type: type });
                    });
                }
            }

            else if ((lowerH.includes('e-mail') || lowerH.includes('email')) && lowerH.includes('value')) {
                let typeIdx = i - 1;
                let type = (typeIdx > -1) ? row[typeIdx] : 'Home';
                type = type.replace(/[*]/g, '').trim() || 'Home';
                
                if (rawValue) {
                    const emails = rawValue.includes(':::') ? rawValue.split(':::') : [rawValue];
                    emails.forEach(email => {
                        if (email.trim()) contact.display.email.push({ email: email.trim(), type: type });
                    });
                }
            }

            else if((lowerH.includes('website') || lowerH.includes('web page')) && lowerH.includes('value')) {
                if (rawValue) {
                    const sites = rawValue.includes(':::') ? rawValue.split(':::') : [rawValue];
                    sites.forEach(site => {
                        if (site.trim()) contact.display.extras.push({ label: 'Website', value: site.trim() });
                    });
                }
            }

            else if (lowerH.includes('address') && lowerH.includes('formatted')) {
                 if (!contact.display.adr) contact.display.adr = rawValue.replace(/\n/g, ', ');
            }
        });

        return contact;
    }).filter(Boolean).sort((a, b) => (a.display.fn || "").localeCompare(b.display.fn || ""));
}

function parseVCF(content) {
    const unfolded = content.replace(/\r\n /g, "").replace(/\n /g, "");
    const cards = unfolded.split(/BEGIN:VCARD/i).slice(1);
    
    return cards.map(cardRaw => {
        const cardLines = cardRaw.split(/\r\n|\n/);
        const contact = { display: { tel:[], email:[], extras:[] } };
        
        let itemLabels = {};
        cardLines.forEach(line => {
            if(line.includes('X-ABLabel') || line.includes('X-ABLABEL')) {
                let [keyPart, ...valParts] = line.split(':');
                let value = valParts.join(':');
                let groupMatch = keyPart.match(/item\d+/);
                if(groupMatch) {
                    let cleanLabel = value.replace(/_\$!<|>\!\$_/g, '');
                    itemLabels[groupMatch[0]] = cleanLabel;
                }
            }
        });

        cardLines.forEach(line => {
            if(line.includes(':')) {
                let [keyPart, ...valParts] = line.split(':');
                let value = valParts.join(':');
                let [fullKey, ...params] = keyPart.split(';');
                
                let groupMatch = fullKey.match(/item\d+/);
                let groupLabel = groupMatch ? itemLabels[groupMatch[0]] : null;
                let cleanKey = fullKey.replace(/item\d+\./, "").toUpperCase();
                
                let type = "OTHER";
                if(groupLabel) {
                    type = groupLabel;
                } else {
                    params.forEach(p => {
                        if(p.toUpperCase().startsWith('TYPE=')) type = p.split('=')[1];
                        if(p.toUpperCase().includes('WHATSAPP')) type = "WHATSAPP";
                    });
                }

                if(cleanKey === 'FN') contact.display.fn = value;
                else if(cleanKey === 'N' && !contact.display.fn) {
                    let parts = value.split(';'); 
                    contact.display.fn = parts.slice(0,2).join(' ').trim();
                }
                else if(cleanKey === 'TEL') contact.display.tel.push({ number: value, type: type });
                else if(cleanKey === 'EMAIL') contact.display.email.push({ email: value, type: type });
                else if(cleanKey === 'ORG') contact.display.org = value;
                else if(cleanKey === 'TITLE') contact.display.title = value;
                else if(cleanKey === 'NOTE') contact.display.note = value;
                else if(cleanKey === 'PHOTO') contact.display.photo = value;
                else if(cleanKey === 'ADR') {
                    let clean = value.replace(/\\n/g, ', ').replace(/\\,/g, ',').replace(/;/g, ' ');
                    contact.display.adr = clean.replace(/\s+/g, ' ').trim();
                }
                else if(cleanKey === 'BDAY') {
                    let d = value.replace(/-/g, '');
                    if(d.length === 8) {
                        let date = new Date(d.substr(0,4), d.substr(4,2)-1, d.substr(6,2));
                        contact.display.bday = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                    } else contact.display.bday = value;
                }
                else if(cleanKey.includes('SOCIALPROFILE') && line.toLowerCase().includes('whatsapp')) {
                    let matches = line.match(/x-user=([^;]+)/);
                    if(matches) contact.display.tel.push({ number: matches[1], type: "WHATSAPP" });
                }
                else if(cleanKey.includes('ABDATE')) {
                     contact.display.extras.push({ label: type || "Date", value: value });
                }
                else if(['URL', 'ROLE'].includes(cleanKey) || cleanKey.startsWith('X-')) {
                    if(!['X-ABLABEL','X-SOCIALPROFILE','X-ABDATE'].some(x => cleanKey.includes(x))) {
                        let label = (cleanKey === 'URL') ? (groupLabel || 'Website') : cleanKey.replace('X-','');
                        contact.display.extras.push({ label: label, value: value });
                    }
                }
            }
        });
        return contact;
    }).sort((a,b) => (a.display.fn||"").localeCompare(b.display.fn||""));
}

function renderLibraries() {
    const container = document.getElementById('libraryList');
    container.innerHTML = '';
    libraries.forEach((lib, idx) => {
        const displayName = lib.name.replace(/\.(vcf|csv)$/i, '');

        const div = document.createElement('div');
        div.className = `library-item ${idx === activeLibIndex ? 'active' : ''}`;
        div.innerHTML = `
            <div class="lib-info">
                <div class="lib-name">${displayName}</div>
                <div class="lib-count">${lib.contacts.length}</div>
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
    renderLibraries(); 
    document.getElementById('searchInput').value = '';
    renderContactList(currentContacts);
}

function renderContactList(list) {
    const listEl = document.getElementById('contactList');
    const jumpEl = document.getElementById('alphaJumper');
    listEl.innerHTML = ''; 
    jumpEl.innerHTML = '';
    let chars = new Set();

    list.forEach(c => {
        let name = c.display.fn || "Unknown";
        let char = name.charAt(0).toUpperCase().replace(/[^A-Z]/, '#');
        let cleanID = 'idx-' + name.replace(/[^a-zA-Z0-9]/g, '');

        let imgHtml = getAvatar(name, c.display.photo, false);

        const item = document.createElement('div');
        item.className = 'contact-item';
        item.id = cleanID;
        item.innerHTML = `
            ${imgHtml}
            <div class="c-info">
                <div class="c-name">${name}</div>
                <div class="c-sub">${c.display.org || (c.display.tel[0]?.number || "")}</div>
            </div>
        `;
        item.onclick = () => {
            document.querySelectorAll('.contact-item').forEach(x => x.classList.remove('active'));
            item.classList.add('active');
            renderDetail(c);
        };
        listEl.appendChild(item);

        if(!chars.has(char)) {
            chars.add(char);
            let jd = document.createElement('div');
            jd.className = 'alpha-char';
            jd.innerText = char;
            jd.onclick = (e) => { 
                e.stopPropagation(); 
                document.getElementById(cleanID).scrollIntoView({behavior:"auto", block:"start"}); 
            };
            jumpEl.appendChild(jd);
        }
    });
}

function renderDetail(c) {
    const view = document.getElementById('detailView');
    let d = c.display;
    let name = d.fn || "Unknown";
    view.dataset.json = JSON.stringify(c); 

    let html = `
        <div class="detail-card">
            <div class="hero-section">
                ${getAvatar(name, d.photo, true)}
                <div class="hero-name">${name}</div>
                <div class="hero-org">${d.title ? d.title + ' - ' : ''}${d.org || ''}</div>
                <div class="hero-actions">
                    <button class="hero-btn" onclick="shareCurrent()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg> Share</button>
                    <button class="hero-btn" onclick="copyCard()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy Card</button>
                </div>
            </div>
    `;

    if(d.tel.length) {
        html += `<div class="info-group">`;
        d.tel.forEach(t => {
            let clean = t.number.replace(/[^0-9+]/g, '');
            let waLink = clean.startsWith('+') ? "https://wa.me/" + clean.substring(1) : null;
            let isWa = t.type && t.type.toUpperCase().includes('WHATSAPP');
            
            html += generateRow('Phone', t.number, t.type||'CELL', [
                {icon:'call', action:`window.open('tel:${t.number}')`},
                (waLink ? {icon:'wa', action:`window.open('${waLink}')`} : null),
                {icon:'copy', action:`copyTxt('${t.number}')`}
            ], isWa);
        });
        html += `</div>`;
    }

    if(d.email.length) {
        html += `<div class="info-group">`;
        d.email.forEach(e => {
            html += generateRow('Email', e.email, e.type||'HOME', [
                {icon:'mail', action:`window.open('mailto:${e.email}')`},
                {icon:'copy', action:`copyTxt('${e.email}')`}
            ]);
        });
        html += `</div>`;
    }

    if(d.adr) html += `<div class="info-group">${generateRow('Address', d.adr, 'HOME', [{icon:'copy', action:`copyTxt('${d.adr.replace(/'/g,"\\'")}')`}])}</div>`;
    if(d.bday) html += `<div class="info-group">${generateRow('Birthday', d.bday, 'DATE', [{icon:'copy', action:`copyTxt('${d.bday}')`}])}</div>`;

    if(d.extras.length || d.note) {
        html += `<div class="info-group">`;
        d.extras.forEach(x => { 
            let safeVal = x.value.replace(/'/g, "\\'");
            html += generateRow(x.label, x.value, 'OTHER', [{icon:'copy', action:`copyTxt('${safeVal}')`}]); 
        });
        
        if(d.note) {
            let cleanNote = d.note.replace(/\\n/g, '\n');
            let copySafeNote = d.note.replace(/\\n/g, '\\n').replace(/'/g, "\\'");
            html += generateRow('Notes', cleanNote, '', [{icon:'copy', action:`copyTxt('${copySafeNote}')`}]);
        }
        html += `</div>`;
    }

    html += `</div>`;
    view.innerHTML = html;
}

function getAvatar(name, photo, isHero) {
    let cls = isHero ? 'hero-avatar' : 'avatar-circle';
    let initials = name.split(' ').map(n=>n[0]).join('').substr(0,2).toUpperCase();
    
    let onError = `this.style.display='none'; this.parentElement.innerText='${initials}'`;
    
    if(photo) {
        let src = photo.startsWith('http') ? photo : (photo.startsWith('data:') ? photo : `data:image/jpeg;base64,${photo}`);
        return `<div class="${cls}"><img src="${src}" onerror="${onError}"></div>`;
    }
    return `<div class="${cls}">${initials}</div>`;
}

function generateRow(label, val, type, actions, isWa=false) {
    if(!val) return '';
    
    const icons = {
        call: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>',
        wa: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>',
        mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline>',
        copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>'
    };

    let btns = actions.filter(a=>a).map(a => 
        `<button class="act-btn ${a.icon==='wa'?'wa-btn':''}" onclick="${a.action}">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[a.icon]}</svg>
         </button>`
    ).join('');

    return `
    <div class="info-row">
        <div class="info-label">${label}</div>
        <div class="info-content">
            <div class="info-value">${val}</div>
            ${type ? `<div class="info-meta"><span class="info-type ${isWa?'wa-tag':''}">${isWa?'WHATSAPP':type}</span></div>` : ''}
        </div>
        <div class="action-bar">${btns}</div>
    </div>`;
}

function filterContacts() {
    let q = document.getElementById('searchInput').value.toLowerCase();
    renderContactList(currentContacts.filter(c => 
        (c.display.fn && c.display.fn.toLowerCase().includes(q)) || 
        (c.display.org && c.display.org.toLowerCase().includes(q))
    ));
}

function generateCleanText(c) {
    let d = c.display;
    let t = `Name: ${d.fn}\n`;
    if(d.org) t += `Organization: ${d.org}\n`;
    d.tel.forEach(x => t+= `Phone (${x.type}): ${x.number}\n`);
    d.email.forEach(x => t+= `Email (${x.type}): ${x.email}\n`);
    if(d.adr) t+= `Address: ${d.adr}\n`;
    if(d.bday) t+= `Birthday: ${d.bday}\n`;
    d.extras.forEach(x => t+= `${x.label}: ${x.value}\n`);
    if(d.note) {
        t+= `Note: ${d.note.replace(/\\n/g, '\n')}\n`;
    }
    return t;
}

function copyCard() {
    let c = JSON.parse(document.getElementById('detailView').dataset.json);
    copyTxt(generateCleanText(c));
}
function shareCurrent() {
    let c = JSON.parse(document.getElementById('detailView').dataset.json);
    if(navigator.share) navigator.share({ title: c.display.fn, text: generateCleanText(c) });
    else copyCard();
}
function copyTxt(t) {
    if(t) t = t.replace(/\\n/g, '\n');
    navigator.clipboard.writeText(t).then(()=>{
        let toast = document.getElementById('toast'); 
        toast.style.opacity=1; 
        setTimeout(()=>toast.style.opacity=0, 2000);
    });
}
