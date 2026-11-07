import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/+esm";
const $=id=>document.getElementById(id);
const socket=io();
let scene,camera,renderer,localId=null,room="PUBLIC",players=new Map(),keys={},moveTouch={forward:false,back:false,left:false,right:false},yaw=0,pitch=0,started=false,shooting=false,score=0,lastSend=0;
const remoteMat=new THREE.MeshStandardMaterial({color:0x397eae,roughness:.65});
const localMat=new THREE.MeshStandardMaterial({color:0xd2a04a,roughness:.65});
const enemyMat=new THREE.MeshStandardMaterial({color:0x26333b,roughness:.8});
const arenaSize=28;
function init(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x9ab5c1);scene.fog=new THREE.Fog(0x9ab5c1,28,75);
 camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.1,120);camera.position.set(0,1.7,5);camera.rotation.order="YXZ";
 renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.getElementById("game").prepend(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xe8f3ff,0x59615c,2.0));const sun=new THREE.DirectionalLight(0xfff1d6,2.5);sun.position.set(-12,22,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);scene.add(sun);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x73796e,roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const grid=new THREE.GridHelper(100,50,0x5b6259,0x626b61);grid.position.y=.015;scene.add(grid);
 for(let i=0;i<22;i++){const x=(Math.random()-.5)*46,z=(Math.random()-.5)*46;if(Math.abs(x)<5&&Math.abs(z)<5)continue;const w=1.4+Math.random()*2.5,h=1.8+Math.random()*3.8,d=1.4+Math.random()*2.5;const box=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:[0x777d7e,0x827c70,0x5d686b][i%3],roughness:.95}));box.position.set(x,h/2,z);box.castShadow=true;box.receiveShadow=true;scene.add(box);const trim=new THREE.Mesh(new THREE.BoxGeometry(w+.08,.13,d+.08),new THREE.MeshStandardMaterial({color:0x454c4d}));trim.position.set(x,h*.72,z);scene.add(trim)}
 for(let i=0;i<4;i++){const wall=new THREE.Mesh(new THREE.BoxGeometry(58,3,1),new THREE.MeshStandardMaterial({color:0x596365}));wall.position.set(0,1.5,(i<2?-1:1)*29);if(i%2) {wall.rotation.y=Math.PI/2;wall.position.set((i===1?1:-1)*29,1.5,0)}scene.add(wall)}
 const gun=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(.16,.17,.7),new THREE.MeshStandardMaterial({color:0x252b30,metalness:.65,roughness:.35}));body.position.set(.32,-.25,-.58);gun.add(body);const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.45,10),new THREE.MeshStandardMaterial({color:0x111619,metalness:.8}));barrel.rotation.x=Math.PI/2;barrel.position.set(.32,-.22,-1.08);gun.add(barrel);camera.add(gun);scene.add(camera);
 addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
 renderer.domElement.addEventListener("click",()=>{if(started&&innerWidth>700)renderer.domElement.requestPointerLock?.()});
 addEventListener("mousemove",e=>{if(document.pointerLockElement===renderer.domElement){yaw-=e.movementX*.002;pitch=Math.max(-1.1,Math.min(1.1,pitch-e.movementY*.002))}});
 renderer.domElement.addEventListener("pointerdown",e=>{if(started&&e.pointerType==="touch"){shoot()}else if(started&&e.pointerType==="mouse")shoot()});
 addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true});addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
 document.querySelectorAll("[data-move]").forEach(b=>{const k=b.dataset.move;b.addEventListener("pointerdown",e=>{e.preventDefault();moveTouch[k]=true});["pointerup","pointerleave","pointercancel"].forEach(ev=>b.addEventListener(ev,()=>moveTouch[k]=false))});
 $("fire").addEventListener("pointerdown",e=>{e.preventDefault();shooting=true;shoot()});["pointerup","pointerleave","pointercancel"].forEach(ev=>$("fire").addEventListener(ev,()=>shooting=false));
 animate();
}
function makePlayer(id,isLocal){const g=new THREE.Group();const mat=isLocal?localMat:remoteMat;const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.38,.75,4,8),mat);torso.position.y=1.05;torso.castShadow=true;g.add(torso);const head=new THREE.Mesh(new THREE.SphereGeometry(.23,16,12),new THREE.MeshStandardMaterial({color:0xc69b7b}));head.position.y=1.75;g.add(head);const pack=new THREE.Mesh(new THREE.BoxGeometry(.48,.55,.22),enemyMat);pack.position.set(0,1.12,.3);g.add(pack);scene.add(g);players.set(id,{group:g,name:"Player",hp:100,score:0});return g}
function updatePlayers(list){const seen=new Set();for(const p of list){seen.add(p.id);let obj=players.get(p.id);if(!obj){makePlayer(p.id,p.id===localId);obj=players.get(p.id)}obj.name=p.name;obj.hp=p.hp;obj.score=p.score;if(p.id!==localId){obj.group.position.set(p.x,0,p.z);obj.group.rotation.y=p.yaw}else{$("hp").textContent=p.hp;$("score").textContent=p.score;if(!p.alive)$("notice").textContent="Eliminated — respawning...";else $("notice").textContent="WASD move · Mouse aim · Click shoot"}}
 for(const [id,obj] of players){if(!seen.has(id)){scene.remove(obj.group);players.delete(id)}}renderBoard()}
function renderBoard(){const rows=[...players.values()].sort((a,b)=>b.score-a.score);$("board").innerHTML="<b>PLAYERS</b><br>"+rows.map(p=>`${escapeHtml(p.name)} · ${p.score} K`).join("<br>");}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function shoot(){if(!started||!localId)return;const dx=-Math.sin(yaw),dz=-Math.cos(yaw);socket.emit("shoot",{dx,dz});}
function animate(){requestAnimationFrame(animate);if(!renderer)return;const now=performance.now();if(started){let f=(keys.w||keys.arrowup||moveTouch.forward?1:0)-(keys.s||keys.arrowdown||moveTouch.back?1:0);let s=(keys.d||keys.arrowright||moveTouch.right?1:0)-(keys.a||keys.arrowleft||moveTouch.left?1:0);const len=Math.hypot(f,s)||1;f/=len;s/=len;const speed=.13;const dx=(-Math.sin(yaw)*f+Math.cos(yaw)*s)*speed;const dz=(-Math.cos(yaw)*f-Math.sin(yaw)*s)*speed;camera.position.x=Math.max(-arenaSize,Math.min(arenaSize,camera.position.x+dx));camera.position.z=Math.max(-arenaSize,Math.min(arenaSize,camera.position.z+dz));camera.rotation.set(pitch,yaw,0);if(now-lastSend>55){socket.emit("move",{x:camera.position.x,z:camera.position.z,yaw});lastSend=now}if(shooting&&now%220<18)shoot()}
 renderer.render(scene,camera)}
function join(mode){const name=$("name").value.trim()||"Player";$("error").textContent="Connecting...";socket.emit("join",{name,mode,roomCode:$("code").value})}
$("public").onclick=()=>join("public");$("private").onclick=()=>{$("privatebox").classList.remove("hidden");$("code").focus()};$("joinprivate").onclick=()=>join("private");
socket.on("connect",()=>{});socket.on("join-error",m=>$("error").textContent=m);socket.on("joined",d=>{localId=d.id;room=d.room;started=true;$("menu").classList.add("hidden");$("hud").classList.remove("hidden");$("board").classList.remove("hidden");$("room").textContent=room;document.exitPointerLock?.()});
socket.on("state",updatePlayers);socket.on("notice",m=>{$("feed").textContent=m;setTimeout(()=>$("feed").textContent="",2500)});socket.on("kill",d=>{$("feed").textContent=`${d.killer} eliminated ${d.victim}`;setTimeout(()=>$("feed").textContent="",2600)});socket.on("hit",d=>{if(d.target===($("name").value.trim()||"Player"))$("notice").textContent=`Hit! ${d.hp} HP remaining`;});
socket.on("shot",d=>{const line=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,Math.hypot(d.dx,d.dz)*3,5),new THREE.MeshBasicMaterial({color:0xffc65a}));line.position.set(d.x+d.dx*1.5,1.55,d.z+d.dz*1.5);line.rotation.x=Math.PI/2;line.rotation.z=Math.atan2(d.dx,d.dz);scene.add(line);setTimeout(()=>scene.remove(line),90)});
init();