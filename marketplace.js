import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.4';
const db=createClient('https://qgjxqddugexuagljrpfq.supabase.co','sb_publishable_av0-baxDgfLzQOIIee438A_8TLqxmTH');
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e};
const msg=(text)=>{$('marketMsg').textContent=text};
let currentUser=null;
const {data:{session}}=await db.auth.getSession();currentUser=session?.user||null;
db.auth.onAuthStateChange((_e,s)=>{currentUser=s?.user||null;if($('marketRoot'))renderOwner()});
async function publicVendors(){
const {data,error}=await db.from('vendors').select('id,business_name,city,category,description,starting_price,status').eq('status','approved').order('created_at',{ascending:false}).limit(100);
if(error){msg(error.message);return}
const {data:photos}=await db.from('vendor_photos').select('vendor_id,storage_path').in('vendor_id',(data||[]).map(x=>x.id).length?(data||[]).map(x=>x.id):['00000000-0000-0000-0000-000000000000']);
const {data:packages}=await db.from('vendor_packages').select('vendor_id,id,title,price,description').in('vendor_id',(data||[]).map(x=>x.id).length?(data||[]).map(x=>x.id):['00000000-0000-0000-0000-000000000000']);
const container=$('marketCards');container.replaceChildren();const searchText=($('search')?.value||'').trim().toLowerCase();const cityText=($('city')?.value||'').trim().toLowerCase();
for(const v of data||[]){if(searchText&&!(v.business_name+' '+v.category).toLowerCase().includes(searchText))continue;if(cityText&&!v.city.toLowerCase().includes(cityText))continue;
const card=el('article',null,'market-vendor');
const photo=(photos||[]).find(p=>p.vendor_id===v.id);
if(photo){const im=el('img');im.src=db.storage.from('vendor-gallery').getPublicUrl(photo.storage_path).data.publicUrl;im.alt=v.business_name+' actual vendor-uploaded setup photo';im.loading='lazy';card.append(im)}
else card.append(el('div','Setup photos coming soon','market-photo-empty'));
const body=el('div',null,'market-vendor-body');body.append(el('span',v.category,'market-chip'),el('h3',v.business_name),el('p','📍 '+v.city,'market-sub'));
const ps=(packages||[]).filter(p=>p.vendor_id===v.id);
body.append(el('p',ps.length?'Packages from ₹'+Math.min(...ps.map(p=>Number(p.price))).toLocaleString('en-IN'):v.starting_price!=null?'Starting ₹'+Number(v.starting_price).toLocaleString('en-IN'):'Contact for pricing','market-sub'));
const btn=el('button','View Profile & Packages');btn.onclick=()=>openProfile(v,ps,(photos||[]).filter(p=>p.vendor_id===v.id));body.append(btn);card.append(body);container.append(card)}
msg((data||[]).length+' approved businesses available');
}
function openProfile(v,packages,photos){
const d=$('profileDialog'),content=$('profileContent');content.replaceChildren();
content.append(el('h2',v.business_name),el('p',v.category+' • '+v.city,'market-sub'));
if(v.description)content.append(el('p',v.description));
const gallery=el('div',null,'market-gallery');
for(const photo of photos){const im=el('img');im.src=db.storage.from('vendor-gallery').getPublicUrl(photo.storage_path).data.publicUrl;im.alt=v.business_name+' setup photo';im.loading='lazy';gallery.append(im)}
if(!photos.length)gallery.append(el('p','This vendor has not uploaded setup photos yet.','market-sub'));
content.append(gallery,el('h3','Packages'));
if(!packages.length)content.append(el('p','Packages not listed yet. Contact vendor with a booking request.','market-sub'));
for(const p of packages){const c=el('div',null,'market-package');c.append(el('strong',p.title),el('span','₹'+Number(p.price).toLocaleString('en-IN')));if(p.description)c.append(el('p',p.description,'market-sub'));content.append(c)}
const book=el('button','Request Booking');book.onclick=()=>{d.close();if(!currentUser){location.href='/account.html';return}if(typeof window.djOpenBooking==='function')window.djOpenBooking(v.id,v.business_name,v.city);else location.href='/#vendors'};content.append(book);d.showModal();
}
async function compressSetupPhoto(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Please choose JPG, PNG or WebP');if(file.size>20*1024*1024)throw Error('Original image must be under 20 MB');const bitmap=await createImageBitmap(file);try{const maxSide=1400,scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);let blob=null;for(const quality of [.78,.65,.52,.4]){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=300*1024)break}if(!blob)throw Error('Image compression failed');if(blob.size>1024*1024)throw Error('Image remains too large after compression');return blob}finally{bitmap.close()}}
async function renderOwner(){
if(!$('marketRoot'))return;const root=$('marketRoot');root.replaceChildren();
if(!currentUser){root.append(el('p','Please sign in above to manage your vendor profile.'));return}
const {data:vendors,error}=await db.from('vendors').select('id,business_name,city,status').eq('owner_id',currentUser.id).order('created_at',{ascending:false});
if(error){root.append(el('p',error.message));return}
if(!vendors?.length){root.append(el('p','Register your business using the form above, then manage your profile here.'));return}
for(const v of vendors){const panel=el('section',null,'market-owner');panel.append(el('h3',v.business_name),el('p','Status: '+v.status,'market-sub'));
const {data:detail}=await db.from('vendor_details').select('about,phone').eq('vendor_id',v.id).maybeSingle();
const detailForm=el('form',null,'market-form');detailForm.innerHTML='<label>About your setup<textarea name="about" rows="3" maxlength="2000" placeholder="Equipment, services, experience..."></textarea></label><label>Business phone (optional)<input name="phone" type="tel" maxlength="20" placeholder="Mobile number"></label><button>Save Profile</button>';detailForm.elements.about.value=detail?.about||'';detailForm.elements.phone.value=detail?.phone||'';
detailForm.onsubmit=async e=>{e.preventDefault();const b=detailForm.querySelector('button');b.disabled=true;const {error}=await db.from('vendor_details').upsert({vendor_id:v.id,owner_id:currentUser.id,about:detailForm.elements.about.value.trim(),phone:detailForm.elements.phone.value.trim()},{onConflict:'vendor_id'});alert(error?'Could not save: '+error.message:'Profile saved');b.disabled=false};
panel.append(detailForm,el('h3','Upload actual setup photos'));
const upload=el('form',null,'market-form');upload.innerHTML='<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required><button>Compress & Upload Photo</button><small>Up to 10 photos per vendor. Images are automatically resized and compressed before upload (target ~300 KB). Original image up to 20 MB.</small>';
upload.onsubmit=async e=>{e.preventDefault();const file=upload.elements.photo.files[0];if(!file)return;const b=upload.querySelector('button');b.disabled=true;b.textContent='Compressing...';let path=null;try{const {count,error:countError}=await db.from('vendor_photos').select('id',{count:'exact',head:true}).eq('vendor_id',v.id);if(countError)throw countError;if(count>=10)throw Error('10 photo limit reached. Remove an existing photo first.');const compressed=await compressSetupPhoto(file);b.textContent='Uploading '+Math.round(compressed.size/1024)+' KB...';path=currentUser.id+'/'+v.id+'/'+crypto.randomUUID()+'.webp';const {error:upErr}=await db.storage.from('vendor-gallery').upload(path,compressed,{contentType:'image/webp'});if(upErr)throw upErr;const {error:rowErr}=await db.from('vendor_photos').insert({vendor_id:v.id,storage_path:path});if(rowErr){await db.storage.from('vendor-gallery').remove([path]);throw rowErr}alert('Photo compressed and uploaded ('+Math.round(compressed.size/1024)+' KB)');await renderOwner()}catch(err){alert('Upload failed: '+(err.message||'Unknown error'))}finally{b.disabled=false;b.textContent='Compress & Upload Photo'}};
panel.append(upload);
const {data:photos}=await db.from('vendor_photos').select('id,storage_path').eq('vendor_id',v.id);
panel.append(el('p',(photos||[]).length+' / 10 photos used','market-sub'));const gallery=el('div',null,'market-gallery');for(const p of photos||[]){const tile=el('div');const im=el('img');im.src=db.storage.from('vendor-gallery').getPublicUrl(p.storage_path).data.publicUrl;im.alt='Your setup';const remove=el('button','Remove photo');remove.onclick=async()=>{if(!confirm('Remove this photo?'))return;const {error}=await db.from('vendor_photos').delete().eq('id',p.id);if(error){alert(error.message);return}await db.storage.from('vendor-gallery').remove([p.storage_path]);await renderOwner()};tile.append(im,remove);gallery.append(tile)}panel.append(gallery,el('h3','Packages & Prices'));
const form=el('form',null,'market-form');form.innerHTML='<input name="title" required maxlength="90" placeholder="Package name (e.g. Wedding DJ)"><textarea name="description" rows="3" maxlength="1200" placeholder="Equipment and services included"></textarea><input name="price" type="number" min="0" step="1" required placeholder="Package price in ₹"><button>Add Package</button>';
form.onsubmit=async e=>{e.preventDefault();const b=form.querySelector('button');b.disabled=true;const {error}=await db.from('vendor_packages').insert({vendor_id:v.id,title:form.elements.title.value.trim(),description:form.elements.description.value.trim(),price:Number(form.elements.price.value)});if(error){alert(error.message);b.disabled=false;return}await renderOwner()};panel.append(form);
const {data:packages}=await db.from('vendor_packages').select('id,title,description,price').eq('vendor_id',v.id);
for(const p of packages||[]){const item=el('div',null,'market-package');item.append(el('strong',p.title),el('span','₹'+Number(p.price).toLocaleString('en-IN')));if(p.description)item.append(el('p',p.description));const del=el('button','Delete');del.onclick=async()=>{if(!confirm('Delete this package?'))return;const {error}=await db.from('vendor_packages').delete().eq('id',p.id);if(error)alert(error.message);else renderOwner()};item.append(del);panel.append(item)}
root.append(panel)}
}
if($('marketCards')){publicVendors();$('find')?.addEventListener('click',publicVendors)}
if($('marketRoot'))renderOwner();
