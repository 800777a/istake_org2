
/**
 * Masks the middle of a name for privacy.
 * Supports Chinese names (3 characters -> O in middle, 2 characters -> last char O)
 * and English names (First part + O).
 */
export const maskName = (name: string, shouldMask: boolean) => {
    if (!name) return "";
    if (!shouldMask) return name;
    
    const isEnglish = /^[A-Za-z\s.-]+$/.test(name);
    if (isEnglish) {
        const parts = name.trim().split(/\s+/);
        const firstPart = parts[0];
        return `${firstPart} Ｏ`;
    } else {
        // Chinese names
        const cleanName = name.trim();
        if (cleanName.length <= 1) return cleanName;
        if (cleanName.length === 2) return cleanName[0] + "Ｏ";
        
        // 3 or more chars: mask middle
        const first = cleanName[0];
        const last = cleanName[cleanName.length - 1];
        return `${first}Ｏ${last}`;
    }
};
