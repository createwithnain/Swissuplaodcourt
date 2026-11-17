import React, {useEffect, useRef, useState} from 'react';
import { Ball, Hoop } from './CourtArt.jsx';
import './swish.css';

function size(bytes) {
  return bytes < 1048576 ? Math.ceil(bytes / 1024) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';
}

export default function SwishUploader({onUpload, maxBytes = 25 * 1024 * 1024}) {
  const [queue, setQueue] = useState([]);
  const [links, setLinks] = useState([]);
  const [made, setMade] = useState(0);
  const [impact, setImpact] = useState({id:0, side:1});
  const [message, say] = useState('Add a file to start shooting.');
  const [phase, setPhase] = useState('ready');
  const [point, setPoint] = useState(null);
  const court = useRef(null), rim = useRef(null), input = useRef(null);
  const drag = useRef(null), frame = useRef(0), busy = useRef(false), request = useRef(null);
  const entry = queue[0];
  const file = entry?.file;
  useEffect(() => () => { cancelAnimationFrame(frame.current); request.current?.abort(); }, []);

  function add(files, origin = null) {
    const all = Array.from(files);
    const accepted = all.filter(f => f.size <= maxBytes);
    setQueue(q => [...q,...accepted.map(file => ({file, origin}))]);
    say(accepted.length < all.length ? 'Oversize files skipped. Limit ' + size(maxBytes) + '.' : 'Drag or flick toward the rim from any side.');
  }
  useEffect(() => {
    if (!entry?.origin || busy.current) return;
    const {width,height} = court.current.getBoundingClientRect();
    shoot({x:entry.origin.x*width, y:entry.origin.y*height});
    return () => { cancelAnimationFrame(frame.current); busy.current = false; };
  }, [entry]);

  function drop(e) {
    e.preventDefault();
    const box = court.current.getBoundingClientRect();
    const clamp = n => Math.max(.04, Math.min(.96, n));
    add(e.dataTransfer.files, {
      x:clamp((e.clientX-box.left)/box.width),
      y:clamp((e.clientY-box.top)/box.height)
    });
  }
  function hit(p, g) {
    return Math.abs(p.x-g.x) <= g.radius+6 && Math.abs(p.y-g.y) <= 18;
  }
  function reset() {
    busy.current = false;
    drag.current = null;
    setPoint(null);
    setPhase('ready');
  }
  async function score(side) {
    setImpact(old => ({id:old.id+1, side:side < 0 ? -1 : 1}));
    setPhase('uploading');
    const controller = new AbortController();
    request.current = controller;
    try {
      const result = await onUpload(file, {signal: controller.signal});
      if (controller.signal.aborted) return;
      if (result?.downloadUrl) {
        let url;
        try { url = new URL(result.downloadUrl, window.location.href); } catch { /* The host returned an invalid URL. */ }
        if (url && ['https:', 'http:'].includes(url.protocol)) {
          setLinks(items => [{name:file.name, href:url.href}, ...items]);
        }
      }
      setMade(n => n + 1);
      setQueue(q => q.slice(1));
      say('Swish! ' + file.name + ' uploaded.');
    } catch {
      if (!controller.signal.aborted) say('Upload failed. Your file is ready to retry.');
    } finally {
      if (!controller.signal.aborted) reset();
    }
  }
  function geometry() {
    const box = court.current.getBoundingClientRect();
    const hoop = rim.current.getBoundingClientRect();
    return {box, x:hoop.left-box.left+hoop.width*.5, y:hoop.top-box.top+hoop.height*.54, radius:hoop.width*.23};
  }
  function shoot(start, velocity) {
    busy.current = true;
    setPhase('flying');
    const {box,x,y,radius} = geometry();
    const assisted = !velocity;
    const duration = hit(start,{x,y,radius}) ? 110 : 520;
    const arc = Math.min(80, Math.hypot(x-start.x,y-start.y)*.28);
    const begin = performance.now();
    let previous = start;
    function tick(now) {
      const t = (now-begin)/1000;
      const u = Math.min(1,(now-begin)/duration);
      const p = assisted ? {x:start.x+(x-start.x)*u, y:start.y+(y-start.y)*u-arc*4*u*(1-u)}
        : {x:start.x+velocity.x*t, y:start.y+velocity.y*t+780*t*t};
      setPoint(p);
      // Test the entire movement segment against the rim, even on slow frames.
      const dy = p.y-previous.y;
      const fraction = dy === 0 ? 1 : Math.max(0,Math.min(1,(y-previous.y)/dy));
      const nearest = {x:previous.x+(p.x-previous.x)*fraction, y:previous.y+dy*fraction};
      if ((assisted && u === 1) || (!assisted && hit(nearest,{x,y,radius}))) {
        setPoint({x,y});
        score(velocity?.x ?? (x-start.x));
        return;
      }
      if (!assisted && (p.y > box.height+40 || p.x < -70 || p.x > box.width+70 || t > 2.6)) {
        say('Just missed! Try again or use Auto shoot.');
        reset(); return;
      }
      previous = p;
      frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
  }
  function local(e) {
    const b = court.current.getBoundingClientRect();
    return {x:e.clientX-b.left,y:e.clientY-b.top};
  }
  function down(e) {
    if (!file || busy.current || drag.current || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    drag.current = {id:e.pointerId, last:p, time:performance.now(), vx:0,vy:0};
    setPhase('dragging'); setPoint(p);
  }
  function move(e) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const p=local(e), now=performance.now(), dt=Math.max(8,now-d.time);
    d.vx=(p.x-d.last.x)*1000/dt; d.vy=(p.y-d.last.y)*1000/dt;
    d.last=p; d.time=now; setPoint(p);
  }
  function release(e) {
    const d=drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current=null;
    const p=local(e), g=geometry();
    if (hit(p,g)) {
      busy.current = true;
      setPoint({x:g.x,y:g.y});
      score(d.vx);
    }
    else if (Math.hypot(d.vx,d.vy) > 75 && performance.now()-d.time < 140) {
      shoot(p,{x:Math.max(-800,Math.min(800,d.vx)),y:Math.max(-1100,Math.min(1100,d.vy))});
    } else {reset(); say('Release over the orange rim or flick toward it.');}
  }
  function auto() {
    if (!file || busy.current || drag.current) return;
    const b=geometry().box;
    shoot({x:b.width/2,y:b.height-50});
  }
  return <section className="sw-app" onDragOver={e=>{if(e.dataTransfer.types.includes('Files')) e.preventDefault();}} onDrop={drop}>
    <header className="sw-brand"><Ball/><strong>Swish<span>.</span></strong><i/>File uploader</header>
    <div className="sw-title"><div><h1>Upload court<span>.</span></h1><p>Pick a file. Line up your shot. Sink it to upload.</p></div>
    <div className="sw-score"><small>UPLOADED</small><b>{String(made).padStart(2,'0')}</b></div></div>
    <div className="sw-layout">
      <div className={'sw-arena'+(file?' sw-active':'')} ref={court}
        onPointerDown={down} onPointerMove={move} onPointerUp={release}
        onPointerCancel={()=>{if(drag.current)reset();}}>
        <div className="sw-courtlines" aria-hidden="true"><i/><b/></div>
        <div className="sw-target" ref={rim}><Hoop key={impact.id} impact={impact}/></div>
        <div className="sw-shotline" aria-hidden="true"/>
        <button type="button" className={'sw-card '+(file?'sw-loaded':'')+' sw-'+phase}
          aria-label={file?'Shoot '+file.name:'Choose files'} style={point?{left:point.x,top:point.y,bottom:'auto'}:undefined}

          onClick={e=>{if(!file)input.current.click();else if(e.detail===0)auto();}}>
          <span className="sw-paper" aria-hidden="true">{file?'↥':'+'}</span>
          <strong>{file ? file.name : 'Add a file'}</strong><small>{file ? 'DRAG TO SHOOT' : 'CHOOSE TO START'}</small>
        </button>
      </div>
      <aside className="sw-panel"><h2>Shot queue <span>{queue.length}</span></h2>
        <p className="sw-help">Drop files from any side to shoot, or browse and take the shot yourself.</p>
        <input hidden ref={input} type="file" multiple onChange={e=>{add(e.target.files);e.target.value='';}}/>
        <button type="button" className="sw-primary" onClick={()=>input.current.click()}>＋ Browse files</button>
        <button type="button" className="sw-auto" disabled={!file||phase!=='ready'} onClick={auto}>↗ &nbsp; Auto shoot</button>
        <p className="sw-limit">Up to {size(maxBytes)} per file</p>
        {queue.length ? <ol className="sw-list">{queue.map(({file:f},i)=><li key={i}><b>{String(i+1).padStart(2,'0')}</b><div><strong>{f.name}</strong><small>{i===0 ? phase==='uploading'?'Uploading…':'On court' : 'In queue'} · {size(f.size)}</small></div></li>)}</ol>
        : <div className="sw-empty"><Ball size={28}/><strong>Your queue is empty</strong><small>Selected files appear here.</small></div>}
        <div role="status" className="sw-status"><i/>{phase==='uploading'?'Uploading…':message}</div>
      </aside>
    </div>
    {links.length > 0 && <section className="sw-downloads" aria-label="Uploaded files">
      <h2>Uploaded files</h2>
      {links.map((link,index) => <div key={links.length-index} className="sw-download">
        <div><strong>{link.name}</strong>
          <input aria-label={'Download link for '+link.name} readOnly value={link.href} onFocus={e=>e.target.select()}/>
        </div>
        <a href={link.href} download={link.name}>Download</a>
        <button type="button" onClick={async e=>{
          const field = e.currentTarget.closest('.sw-download').querySelector('input');
          try { await navigator.clipboard.writeText(link.href); say('Link copied for '+link.name+'.'); }
          catch { field.focus(); field.select(); say('Link selected. Use Copy to share it.'); }
        }}>Copy link</button>
      </div>)}
    </section>}
  </section>;
}
