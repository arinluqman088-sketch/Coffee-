const LS = "CAFE_POS_PRO_DATA_V1";

const defaultData = {
  user: { username: "admin", password: "1234", shopName: "Cafe POS Pro", phone: "0770 000 0000" },
  menu: [
    {id: crypto.randomUUID(), code:"C001", name:"Espresso", category:"Coffee", price:2000, cost:900, stock:100, minStock:10},
    {id: crypto.randomUUID(), code:"C002", name:"Latte", category:"Coffee", price:3000, cost:1400, stock:100, minStock:10},
    {id: crypto.randomUUID(), code:"C003", name:"Cappuccino", category:"Coffee", price:3000, cost:1400, stock:100, minStock:10},
    {id: crypto.randomUUID(), code:"T001", name:"Tea", category:"Tea", price:1000, cost:300, stock:100, minStock:10},
    {id: crypto.randomUUID(), code:"D001", name:"Cake", category:"Dessert", price:2500, cost:1200, stock:25, minStock:5}
  ],
  tables: [
    {id:"T1", name:"مێز 1"},
    {id:"T2", name:"مێز 2"},
    {id:"T3", name:"مێز 3"},
    {id:"T4", name:"مێز 4"},
    {id:"T5", name:"مێز 5"},
    {id:"TA", name:"Takeaway"}
  ],
  orders: [],
  sales: []
};

let data = loadData();
let state = {
  page:"pos",
  cart:[],
  logged:false,
  selectedTable:"Takeaway",
  editingItem:null
};

function loadData(){
  const raw = localStorage.getItem(LS);

  if(!raw){
    localStorage.setItem(LS, JSON.stringify(defaultData));
    return structuredClone(defaultData);
  }

  try{
    return JSON.parse(raw);
  }catch{
    return structuredClone(defaultData);
  }
}

function save(){
  localStorage.setItem(LS, JSON.stringify(data));
}

function byId(id){
  return document.getElementById(id);
}

function money(n){
  return Number(n || 0).toLocaleString() + " IQD";
}

function today(){
  return new Date().toISOString().slice(0,10);
}

function month(){
  return new Date().toISOString().slice(0,7);
}

function render(){
  const app = byId("app");

  if(!state.logged){
    app.innerHTML = `
    <div class="login card cafe-login">
      <div class="coffee-logo">☕</div>

      <h2>چوونەژوورەوە</h2>
      <p class="muted">سیستەمی کاشێری قاوەخانە</p>

      <div class="coffee-slogan">
        <div>لێرە هەموو شتێك بە بۆنی قاوە</div>
        <div>دەست پێدەكات ☕️</div>
      </div>

      <label>Username</label>
      <input id="loginUser" value="admin">

      <label>Password</label>
      <input id="loginPass" type="password" value="1234">

      <button onclick="login()" style="margin-top:12px">Login</button>
    </div>`;
    return;
  }

  app.innerHTML = `
  <div class="app">
    <div class="topbar">
      <div class="brand">☕ ${data.user.shopName}</div>

      <div class="actions">
        <span class="badge">${new Date().toLocaleDateString()}</span>
        <button class="secondary" onclick="logout()">Logout</button>
      </div>
    </div>

    <div class="layout">
      <div class="sidebar">
        ${nav("pos","🧾 فرۆشتن")}
        ${nav("menu","☕ منیو")}
        ${nav("tables","🪑 مێزەکان")}
        ${nav("reports","📊 ڕاپۆرت")}
        ${nav("settings","⚙️ ڕێکخستن")}
      </div>

      <div class="content">${pageHtml()}</div>
    </div>
  </div>

  <div id="printArea" class="hidden"></div>`;

  setTimeout(renderMenuGrid, 50);
}

function nav(p,t){
  return `<button class="navbtn ${state.page===p ? "active" : ""}" onclick="go('${p}')">${t}</button>`;
}

function go(p){
  state.page = p;
  render();
}

function login(){
  const u = byId("loginUser").value.trim();
  const p = byId("loginPass").value;

  if(u === data.user.username && p === data.user.password){
    state.logged = true;
    render();
  }else{
    alert("Username یان Password هەڵەیە");
  }
}

function logout(){
  state.logged = false;
  render();
}

function pageHtml(){
  if(state.page === "pos") return posHtml();
  if(state.page === "menu") return menuHtml();
  if(state.page === "tables") return tablesHtml();
  if(state.page === "reports") return reportsHtml();
  return settingsHtml();
}

function posHtml(){
  const total = state.cart.reduce((s,i)=>s + i.qty * i.price, 0);
  const cats = [...new Set(data.menu.map(x=>x.category || "Other"))];

  return `
  <div class="grid two">
    <div class="card">
      <h2>فرۆشتن / Order</h2>

      <label>مێز / Takeaway</label>
      <select id="tableSelect" onchange="state.selectedTable=this.value">
        ${data.tables.map(t=>`
          <option ${state.selectedTable===t.name ? "selected" : ""}>${t.name}</option>
        `).join("")}
      </select>

      <div class="categorybar">
        <button class="secondary" onclick="filterMenu('')">هەموو</button>
        ${cats.map(c=>`
          <button class="secondary" onclick="filterMenu('${c}')">${c}</button>
        `).join("")}
      </div>

      <input id="menuSearch" placeholder="گەڕان بە ناو یان کۆد..." oninput="renderMenuGrid()">

      <div id="menuGrid" class="menugrid"></div>
    </div>

    <div class="card">
      <h2>سەبەتە</h2>

      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th>ئایتم</th>
              <th>دانە</th>
              <th>نرخ</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            ${state.cart.map((i,idx)=>`
              <tr>
                <td>${i.name}</td>
                <td>
                  <input
                    style="width:70px"
                    type="number"
                    min="1"
                    value="${i.qty}"
                    onchange="setQty(${idx},this.value)"
                  >
                </td>
                <td>${money(i.qty * i.price)}</td>
                <td>
                  <button class="red" onclick="removeCart(${idx})">X</button>
                </td>
              </tr>
            `).join("") || `<tr><td colspan="4" class="muted">هیچ شتێک زیاد نەکراوە</td></tr>`}
          </tbody>
        </table>
      </div>

      <label>داشکاندن</label>
      <input id="discount" type="number" value="0">

      <label>پارەی وەرگیراو</label>
      <input id="paid" type="number" value="${total}">

      <div class="kpi">${money(total)}</div>

      <div class="actions">
        <button class="green" onclick="checkout()">فرۆشتن و چاپ</button>
        <button class="amber" onclick="saveOpenOrder()">هەڵگرتنی Order</button>
        <button class="secondary" onclick="clearCart()">پاککردنەوە</button>
      </div>
    </div>
  </div>`;
}

function filterMenu(cat){
  const input = byId("menuSearch");
  if(input){
    input.dataset.cat = cat;
    renderMenuGrid();
  }
}

function renderMenuGrid(){
  const box = byId("menuGrid");
  if(!box) return;

  const search = byId("menuSearch");
  const q = (search.value || "").toLowerCase();
  const cat = search.dataset.cat || "";

  const items = data.menu.filter(x =>
    (!cat || x.category === cat) &&
    (
      x.name.toLowerCase().includes(q) ||
      x.code.toLowerCase().includes(q)
    )
  );

  box.innerHTML = items.map(i=>`
    <button class="itembtn" onclick="addItem('${i.id}')">
      <b>${i.name}</b>
      <span>${i.category}</span>
      <strong>${money(i.price)}</strong>
    </button>
  `).join("");
}

function addItem(id){
  const p = data.menu.find(x=>x.id === id);
  if(!p) return;

  if(Number(p.stock) <= 0){
    return alert("ئەم ئایتمە نەماوە");
  }

  const item = state.cart.find(x=>x.id === id);

  if(item){
    item.qty++;
  }else{
    state.cart.push({
      id:p.id,
      name:p.name,
      price:Number(p.price),
      cost:Number(p.cost || 0),
      qty:1
    });
  }

  render();
}

function setQty(idx,v){
  state.cart[idx].qty = Math.max(1, Number(v || 1));
  render();
}

function removeCart(idx){
  state.cart.splice(idx,1);
  render();
}

function clearCart(){
  state.cart = [];
  render();
}

/* ✅ ئەم بەشە چاککراوە بۆ ئەوەی وەسل بەتاڵ نەبێت */
function checkout(){
  if(!state.cart.length){
    return alert("سەبەتە بەتاڵە");
  }

  const subtotal = state.cart.reduce((s,i)=>s + i.qty * i.price, 0);
  const discount = Number(byId("discount").value || 0);
  const total = Math.max(0, subtotal - discount);
  const paid = Number(byId("paid").value || 0);

  if(paid < total){
    return alert("پارەی وەرگیراو کەمە");
  }

  const sale = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    table: state.selectedTable,
    items: structuredClone(state.cart),
    subtotal,
    discount,
    total,
    paid,
    change: paid - total
  };

  sale.items.forEach(it=>{
    const p = data.menu.find(x=>x.id === it.id);
    if(p){
      p.stock = Number(p.stock || 0) - it.qty;
    }
  });

  data.sales.unshift(sale);
  data.orders = data.orders.filter(o=>o.table !== state.selectedTable);

  save();

  /* گرنگ: render لێرە ناکەین، چونکە وەسلەکە دەسڕدرێتەوە */
  printReceipt(sale);
}

function saveOpenOrder(){
  if(!state.cart.length){
    return alert("سەبەتە بەتاڵە");
  }

  data.orders = data.orders.filter(o=>o.table !== state.selectedTable);

  data.orders.unshift({
    id: Date.now().toString(),
    table: state.selectedTable,
    date: new Date().toISOString(),
    items: structuredClone(state.cart)
  });

  save();

  alert("Order هەڵگیرا");

  state.cart = [];
  render();
}

function loadOrder(table){
  const o = data.orders.find(x=>x.table === table);

  if(!o){
    return alert("هیچ Order ـێک نییە");
  }

  state.selectedTable = table;
  state.cart = structuredClone(o.items);
  state.page = "pos";

  render();
}

function deleteOrder(table){
  if(!confirm("Order بسڕدرێتەوە؟")) return;

  data.orders = data.orders.filter(x=>x.table !== table);

  save();
  render();
}

/* ✅ وەسلەکە چاککراوە */
function printReceipt(sale){
  const lines = sale.items.map(i=>`
    <tr>
      <td>${i.name}</td>
      <td>${i.qty}</td>
      <td>${money(i.qty * i.price)}</td>
    </tr>
  `).join("");

  const area = byId("printArea");

  area.innerHTML = `
  <div class="receipt">
    <div class="receipt-head">
      <div class="receipt-logo">☕</div>
      <h3>${data.user.shopName}</h3>
      <p>${data.user.phone || ""}</p>
    </div>

    <div class="receipt-info">
      <p><b>Table:</b> ${sale.table}</p>
      <p><b>Receipt:</b> ${sale.id}</p>
      <p><b>Date:</b> ${new Date(sale.date).toLocaleString()}</p>
    </div>

    <hr>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${lines}</tbody>
    </table>

    <hr>

    <div class="receipt-total">
      <p>Subtotal: ${money(sale.subtotal)}</p>
      <p>Discount: ${money(sale.discount)}</p>
      <h3>Total: ${money(sale.total)}</h3>
      <p>Paid: ${money(sale.paid)}</p>
      <p>Change: ${money(sale.change)}</p>
    </div>

    <div class="receipt-footer">
      <p>لێرە هەموو شتێك بە بۆنی قاوە دەست پێدەكات ☕️</p>
      <p>Thank you</p>
    </div>
  </div>`;

  area.classList.remove("hidden");
  document.body.classList.add("printing-receipt");

  setTimeout(()=>{
    window.print();
  }, 350);

  const cleanPrint = ()=>{
    document.body.classList.remove("printing-receipt");

    area.classList.add("hidden");
    area.innerHTML = "";

    state.cart = [];
    render();

    window.removeEventListener("afterprint", cleanPrint);
  };

  window.addEventListener("afterprint", cleanPrint);

  setTimeout(()=>{
    if(document.body.classList.contains("printing-receipt")){
      cleanPrint();
    }
  }, 60000);
}

function menuHtml(){
  return `
  <div class="grid two">
    <div class="card">
      <h2>${state.editingItem ? "دەستکاری ئایتم" : "زیادکردنی ئایتم"}</h2>

      <label>کۆد</label>
      <input id="mCode">

      <label>ناو</label>
      <input id="mName">

      <label>جۆر</label>
      <input id="mCategory" placeholder="Coffee / Tea / Dessert">

      <div class="row">
        <div>
          <label>نرخی فرۆشتن</label>
          <input id="mPrice" type="number">
        </div>

        <div>
          <label>نرخی کڕین</label>
          <input id="mCost" type="number">
        </div>
      </div>

      <div class="row">
        <div>
          <label>ستۆک</label>
          <input id="mStock" type="number" value="100">
        </div>

        <div>
          <label>ئاگاداری ستۆک</label>
          <input id="mMin" type="number" value="5">
        </div>
      </div>

      <div class="actions" style="margin-top:12px">
        <button class="green" onclick="saveMenuItem()">هەڵگرتن</button>
        <button class="secondary" onclick="state.editingItem=null;render()">نوێ</button>
      </div>
    </div>

    <div class="card">
      <h2>منیو</h2>
      <input id="menuListSearch" placeholder="گەڕان..." oninput="renderMenuTable()">
      <div id="menuTable" style="margin-top:12px"></div>
    </div>
  </div>`;
}

function renderMenuTable(){
  const box = byId("menuTable");
  if(!box) return;

  const q = (byId("menuListSearch")?.value || "").toLowerCase();

  const rows = data.menu
    .filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q)
    )
    .map(p=>`
      <tr>
        <td>${p.code}</td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${money(p.price)}</td>
        <td>
          <span class="badge ${p.stock <= p.minStock ? "low" : ""}">${p.stock}</span>
        </td>
        <td>
          <button class="blue" onclick="editMenuItem('${p.id}')">Edit</button>
          <button class="red" onclick="deleteMenuItem('${p.id}')">Delete</button>
        </td>
      </tr>
    `).join("");

  box.innerHTML = `
  <div class="tablewrap">
    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>ناو</th>
          <th>جۆر</th>
          <th>نرخ</th>
          <th>ستۆک</th>
          <th></th>
        </tr>
      </thead>

      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function saveMenuItem(){
  const item = {
    id: state.editingItem || crypto.randomUUID(),
    code: byId("mCode").value.trim(),
    name: byId("mName").value.trim(),
    category: byId("mCategory").value.trim() || "Other",
    price: Number(byId("mPrice").value || 0),
    cost: Number(byId("mCost").value || 0),
    stock: Number(byId("mStock").value || 0),
    minStock: Number(byId("mMin").value || 0)
  };

  if(!item.code || !item.name || !item.price){
    return alert("کۆد، ناو و نرخ پێویستن");
  }

  const exists = data.menu.find(x=>x.code === item.code && x.id !== item.id);

  if(exists){
    return alert("ئەم کۆدە پێشتر هەیە");
  }

  const idx = data.menu.findIndex(x=>x.id === item.id);

  if(idx >= 0){
    data.menu[idx] = item;
  }else{
    data.menu.unshift(item);
  }

  state.editingItem = null;

  save();
  render();
}

function editMenuItem(id){
  state.editingItem = id;

  render();

  const p = data.menu.find(x=>x.id === id);

  byId("mCode").value = p.code;
  byId("mName").value = p.name;
  byId("mCategory").value = p.category || "";
  byId("mPrice").value = p.price;
  byId("mCost").value = p.cost;
  byId("mStock").value = p.stock;
  byId("mMin").value = p.minStock || 0;
}

function deleteMenuItem(id){
  if(!confirm("ئایتم بسڕدرێتەوە؟")) return;

  data.menu = data.menu.filter(x=>x.id !== id);

  save();
  render();
}

function tablesHtml(){
  return `
  <div class="grid two">
    <div class="card">
      <h2>زیادکردنی مێز</h2>

      <label>ناوی مێز</label>
      <input id="tableName" placeholder="مێز 6">

      <button class="green" style="margin-top:12px" onclick="addTable()">زیادکردن</button>
    </div>

    <div class="card">
      <h2>Order ـە کراوەکان</h2>

      <div class="tablewrap">
        <table>
          <thead>
            <tr>
              <th>مێز</th>
              <th>کات</th>
              <th>کۆ</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            ${data.orders.map(o=>{
              const total = o.items.reduce((s,i)=>s + i.qty * i.price, 0);

              return `
              <tr>
                <td>${o.table}</td>
                <td>${new Date(o.date).toLocaleString()}</td>
                <td>${money(total)}</td>
                <td>
                  <button class="blue" onclick="loadOrder('${o.table}')">کردنەوە</button>
                  <button class="red" onclick="deleteOrder('${o.table}')">سڕینەوە</button>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="card" style="margin-top:14px">
    <h2>مێزەکان</h2>

    <div class="menugrid">
      ${data.tables.map(t=>`
        <button class="itembtn" onclick="state.selectedTable='${t.name}';state.page='pos';render()">
          <b>${t.name}</b>
          <span>${data.orders.find(o=>o.table===t.name) ? "Order هەیە" : "بەتاڵ"}</span>
        </button>
      `).join("")}
    </div>
  </div>`;
}

function addTable(){
  const name = byId("tableName").value.trim();

  if(!name){
    return alert("ناو بنووسە");
  }

  data.tables.push({
    id: crypto.randomUUID(),
    name
  });

  save();
  render();
}

function reportsHtml(){
  const daySales = data.sales.filter(s=>s.date.slice(0,10) === today());
  const monthSales = data.sales.filter(s=>s.date.slice(0,7) === month());

  const totalDay = daySales.reduce((s,x)=>s + x.total, 0);

  const profitDay = daySales.reduce((s,x)=>
    s + x.items.reduce((a,i)=>a + (i.price - i.cost) * i.qty, 0) - x.discount
  ,0);

  const totalMonth = monthSales.reduce((s,x)=>s + x.total, 0);

  return `
  <div class="grid three">
    <div class="card">
      <div class="muted">فرۆشتنی ئەمڕۆ</div>
      <div class="kpi">${money(totalDay)}</div>
    </div>

    <div class="card">
      <div class="muted">قازانجی ئەمڕۆ</div>
      <div class="kpi">${money(profitDay)}</div>
    </div>

    <div class="card">
      <div class="muted">فرۆشتنی مانگ</div>
      <div class="kpi">${money(totalMonth)}</div>
    </div>
  </div>

  <div class="card" style="margin-top:14px">
    <h2>دوایین فرۆشتنەکان</h2>

    <div class="tablewrap">
      <table>
        <thead>
          <tr>
            <th>ژمارە</th>
            <th>کات</th>
            <th>مێز</th>
            <th>کۆ</th>
          </tr>
        </thead>

        <tbody>
          ${data.sales.slice(0,100).map(s=>`
            <tr>
              <td>${s.id}</td>
              <td>${new Date(s.date).toLocaleString()}</td>
              <td>${s.table}</td>
              <td>${money(s.total)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  </div>`;
}

function settingsHtml(){
  return `
  <div class="grid two">
    <div class="card">
      <h2>ڕێکخستنی قاوەخانە</h2>

      <label>ناوی قاوەخانە</label>
      <input id="shopName" value="${data.user.shopName}">

      <label>مۆبایل</label>
      <input id="shopPhone" value="${data.user.phone}">

      <label>Password نوێ</label>
      <input id="newPass" placeholder="بەتاڵی بهێڵە ئەگەر ناگۆڕیت">

      <button class="green" style="margin-top:12px" onclick="saveSettings()">هەڵگرتن</button>
    </div>

    <div class="card">
      <h2>Backup</h2>

      <div class="actions">
        <button class="blue" onclick="exportBackup()">Export Backup</button>
        <button class="amber" onclick="byId('importFile').click()">Import Backup</button>
        <input id="importFile" type="file" accept=".json" class="hidden" onchange="importBackup(event)">
      </div>

      <p class="muted">هەفتانە Backup بکە.</p>

      <button class="red" onclick="resetAll()">Reset System</button>
    </div>
  </div>`;
}

function saveSettings(){
  data.user.shopName = byId("shopName").value.trim() || "Cafe POS Pro";
  data.user.phone = byId("shopPhone").value.trim();

  const np = byId("newPass").value;

  if(np){
    data.user.password = np;
  }

  save();
  render();
}

function exportBackup(){
  const blob = new Blob([JSON.stringify(data,null,2)], {
    type:"application/json"
  });

  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download = "cafe-pos-backup.json";
  a.click();
}

function importBackup(e){
  const f = e.target.files[0];

  if(!f) return;

  const r = new FileReader();

  r.onload = ()=>{
    try{
      data = JSON.parse(r.result);
      save();
      alert("Backup گەڕایەوە");
      render();
    }catch{
      alert("فایل هەڵەیە");
    }
  };

  r.readAsText(f);
}

function resetAll(){
  if(confirm("دڵنیایت هەموو داتا بسڕدرێتەوە؟")){
    localStorage.removeItem(LS);
    data = loadData();
    state.cart = [];
    render();
  }
}

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./service-worker.js");
}

render();