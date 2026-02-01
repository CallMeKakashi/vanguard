export interface Achievement {
    apiname: string;
    achieved: number;
    unlocktime: number;
    name?: string;
    description?: string;
}

export interface Game {
    appid: number;
    name: string;
    playtime_forever: number;
    playtime_2weeks?: number;
    img_icon_url?: string;
    has_community_visible_stats?: boolean;
    achievements?: Achievement[];
}

export interface Profile {
    avatarfull: string;
    personaname: string;
    personastate: number;
    profileurl: string;
}
