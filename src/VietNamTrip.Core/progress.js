// Get the list of unlocked provinces
export function getUnlockedProvinceIds(provinces, completedProvinceIds = []) {
    const completed = new Set(completedProvinceIds);
    const unlocked = [];

    if (provinces.length === 0) {
        return unlocked;
    }

    // The first province is unlocked by default
    unlocked.push(provinces[0].id);

    // Unlock the next province when the previous one is completed
    for (let i = 1; i < provinces.length; i++) {
        const previousProvince = provinces[i - 1];

        if (completed.has(previousProvince.id)) {
            unlocked.push(provinces[i].id);
        } else {
            break;
        }
    }

    return unlocked;
}


// Mark a province as completed
export function completeProvince(provinceId, completedProvinceIds = []) {
    if (completedProvinceIds.includes(provinceId)) {
        return completedProvinceIds;
    }

    return [...completedProvinceIds, provinceId];
}


// Save progress to localStorage
export function saveProgress(completedProvinceIds) {
    localStorage.setItem(
        "vietnamtrip_progress",
        JSON.stringify(completedProvinceIds)
    );
}


// Load progress from localStorage
export function loadProgress() {
    const savedProgress = localStorage.getItem("vietnamtrip_progress");

    if (!savedProgress) {
        return [];
    }

    try {
        const parsedProgress = JSON.parse(savedProgress);

        if (!Array.isArray(parsedProgress)) {
            return [];
        }

        return parsedProgress;
    } catch {
        return [];
    }
}