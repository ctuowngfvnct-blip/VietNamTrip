const map = L.map('map').setView([16.0, 106.0], 6);

import { playMove } from '../src/VietNamTrip.Core/game.js';
import { shufflePuzzle } from '../src/VietNamTrip.Core/puzzle.js';
import { loadProgress } from '../src/VietNamTrip.Core/progress.js';

let gameState = null;
let tinhDangChoi = null;
let danhSachTinh = [];   // thứ tự tỉnh, dùng cho việc mở khóa lần lượt

const MAU_TINH = {
  lam_dong: '#708090',
  tuyen_quang: '#708090',
  cao_bang: '#708090',
  lai_chau: '#708090',
  lao_cai: '#708090',
  thai_nguyen: '#056608',
  dien_bien: '#708090',
  lang_son: '#708090',
  son_la: '#708090',
  phu_tho: '#056608',
  bac_ninh: '#ffcc00',
  quang_ninh: '#0077BE',
  ha_noi: '#ffa600',
  hai_phong: '#0077BE',
  hung_yen: '#ffcc00',
  ninh_binh: '#918E85',
  thanh_hoa: '#ffcc00',
  nghe_an: '#708090',
  ha_tinh: '#0077BE',
  quang_tri: '#056608',
  hue: '#0077BE',
  da_nang: '#0077BE',
  quang_ngai: '#0077BE',
  gia_lai: '#708090',
  dak_lak: '#708090',
  khanh_hoa: '#0077BE',
  dong_nai: '#056608',
  tay_ninh: '#056608',
  ho_chi_minh_city: '#ffa600',
  dong_thap: '#ffcc00',
  an_giang: '#ffcc00',
  vinh_long: '#ffcc00',
  can_tho: '#ffcc00',
  ca_mau: '#0077BE'
};
const MAU_MAC_DINH = '#81c784';  // dùng khi tỉnh chưa có màu trong bảng

fetch('../data/boundaries.geojson')
  .then(res => res.json())
  .then(data => {
    // File là mảng nhiều FeatureCollection → gộp lại thành 1 mảng feature
    const features = Array.isArray(data)
      ? data.flatMap(fc => fc.features)
      : data.features;

    danhSachTinh = features.map(f => ({ id: f.properties.id, name: f.properties.name }));

    const provincesLayer = L.geoJSON(features, {
      style: {
        fillColor: '#bdbdbd',  // xám
        fillOpacity: 1,
        color: '#ffffff',      // viền trắng
        weight: 1
      },

      onEachFeature: (feature, layer) => {
      // 1. Nhãn tên tỉnh
      L.marker(viTriTenTinh(feature), {
        icon: L.divIcon({
        className: 'nhan-tinh',
        html: feature.properties.name
      }),
      interactive: false
      }).addTo(map);

      // 2. Bấm vào tỉnh → mở game
      layer.on('click', () => moGame(feature, layer));

      if (loadProgress().includes(feature.properties.id)) moKhoa(feature.properties.id, layer);
    }
    }).addTo(map);

    map.fitBounds(provincesLayer.getBounds());
  });

function viTriTenTinh(feature) {
  let vung = feature;

  if (feature.geometry.type === 'MultiPolygon') {
    // Tách từng mảnh ra, chọn mảnh có diện tích lớn nhất
    let lonNhat = null;
    let dienTichMax = 0;
    for (const toaDo of feature.geometry.coordinates) {
      const manh = turf.polygon(toaDo);
      const s = turf.area(manh);
      if (s > dienTichMax) {
        dienTichMax = s;
        lonNhat = manh;
      }
    }
    vung = lonNhat;
  }

  const [lng, lat] = turf.pointOnFeature(vung).geometry.coordinates;
  return [lat, lng];  // Turf trả [lng, lat], Leaflet cần [lat, lng]
}

function moGame(feature, layer) {
  console.log('Bấm vào:', feature.properties.id, feature.properties.name);
  const id = feature.properties.id;

  gameState = {
    provinces: danhSachTinh,
    provinceId: id,
    puzzle: shufflePuzzle(seedNgauNhien()),
    completedProvinceIds: loadProgress(),
    unlockedProvinceIds: [],
    isSolved: false
  };

  tinhDangChoi = { id, layer, anh: `../picture/${id.replace(/_/g, '')}.webp` };

  document.getElementById('tieu-de').textContent = feature.properties.name;
  veManhGhep();
  document.getElementById('cua-so').classList.remove('an');
}

// Seed cố định 12345 thì tỉnh nào cũng bị xáo giống hệt nhau
function seedNgauNhien() {
  return Math.floor(Math.random() * 2147483645) + 1;  // không được = 0
}

document.getElementById('nut-dong').onclick = () => {
  document.getElementById('cua-so').classList.add('an');
};

function moKhoa(id, layer) {
  layer.setStyle({ fillColor: MAU_TINH[id] || MAU_MAC_DINH });
}

document.getElementById('nut-thang').onclick = () => {
  if (!tinhDangChoi) return;
  moKhoa(tinhDangChoi.id, tinhDangChoi.layer);
  luuTienDo(tinhDangChoi.id);
  document.getElementById('cua-so').classList.add('an');
};

function docTienDo() {
  try { return JSON.parse(localStorage.getItem('tinhDaMo')) || []; }
  catch { return []; }
}

function luuTienDo(id) {
  const ds = docTienDo();
  if (!ds.includes(id)) ds.push(id);
  localStorage.setItem('tinhDaMo', JSON.stringify(ds));
}

function veManhGhep() {
  const khu = document.getElementById('khu-ghep');
  khu.innerHTML = '';

  gameState.puzzle.forEach((giaTri, viTri) => {
    const o = document.createElement('div');
    o.className = 'manh';

    if (giaTri === 0) {
      o.classList.add('trong');
    } else {
      // Mảnh số giaTri thuộc hàng/cột nào trong ảnh gốc?
      const hang = Math.floor((giaTri - 1) / 3);
      const cot  = (giaTri - 1) % 3;
      o.style.backgroundImage = `url(${tinhDangChoi.anh})`;
      o.style.backgroundPosition = `${cot * 50}% ${hang * 50}%`;
    }

    o.onclick = () => bamManh(viTri);
    khu.appendChild(o);
  });
}

function bamManh(viTri) {
  gameState = playMove(gameState, viTri);  // game.js lo hết: di chuyển, kiểm tra thắng, lưu
  veManhGhep();

  if (gameState.isSolved) {
    moKhoa(tinhDangChoi.id, tinhDangChoi.layer);
    setTimeout(() => {
      alert(`Chúc mừng! Bạn đã mở khóa ${document.getElementById('tieu-de').textContent}`);
      document.getElementById('cua-so').classList.add('an');
    }, 300);
  }
}