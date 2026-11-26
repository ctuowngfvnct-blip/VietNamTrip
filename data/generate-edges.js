
import fs from "node:fs";

const poiIds = [
    // Lâm Đồng
    "puppy_farm",
    "vuon_hoa_da_lat",
    "langbiang",
    "nam_nuong",
    "bina_bina",
    "peach_valley_hotel",
    "ngoc_phat_hotel",
    "huyen_179_hotel",
    "hoan_my_hospital",
    "lam_dong_general_hospital",

    // Quảng Ninh
    "vinh_ha_long",
    "bao_tang_quang_ninh",
    "sun_world_ha_long",
    "dao_tuan_chau",
    "cong_vien_quoc_te_hoang_gia",
    "dao_co_to",
    "bv_da_khoa_tinh_quang_ninh",
    "vinpearl_resort_ha_long",
    "legacy_yen_tu_mgallery",
    "nha_hang_linh_dan",
    "vinh_seafood_restaurant",
    "nha_hang_canh_gia_quan",

    // Ninh Bình
    "the_reed_hotel",
    "tam_coc_garden_resort",
    "nha_hang_duc_de",
    "nha_hang_chinh_thu",
    "nha_hang_thanh_long",
    "trang_an",
    "tam_coc_bich_dong",
    "chua_bai_dinh",
    "hang_mua",
    "co_do_hoa_lu",
    "pho_co_hoa_lu",
    "vuon_quoc_gia_cuc_phuong",
    "bv_da_khoa_tinh_ninh_binh",

    // Thái Nguyên
    "bv_quoc_te_thai_nguyen",
    "bv_trung_uong_thai_nguyen",
    "bao_tang_van_hoa_cac_dan_toc_viet_nam",
    "ho_nui_coc",
    "khu_sinh_thai_nha_toi",
    "x_hotel_thai_nguyen",
    "may_plaza_hotel",
    "seoul_boss_thai_nguyen",
    "nhiep_cuon_minh_cau",
    "dookki_vincom_thai_nguyen",

    // Bắc Ninh
    "bv_da_khoa_bac_ninh_so_2",
    "bv_quan_y_110",
    "cong_vien_ho_dieu_hoa_van_mieu",
    "thu_thuy_ecolodge",
    "khu_du_lich_sinh_thai_suoi_mo",
    "vinpearl_hotel_bac_ninh",
    "muong_thanh_luxury_bac_ninh",
    "jinro_bbq_bac_ninh",
    "joythai_bac_ninh",
    "nuong_vu_gia_kinh_bac_1"
];

const edges = [];

for (let i = 0; i < poiIds.length; i++) {
    for (let j = i + 1; j < poiIds.length; j++) {
        edges.push({
            from: poiIds[i],
            to: poiIds[j],
            minutes: null,
            km: null,
            cost_vnd: null
        });
    }
}

fs.writeFileSync(
    "./data/edges.json",
    JSON.stringify(edges, null, 2),
    "utf8"
);

console.log("Total POIs:", poiIds.length);
console.log("Total edges:", edges.length);
console.log("Created data/edges.json successfully!");
