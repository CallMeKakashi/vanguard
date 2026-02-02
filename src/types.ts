export interface Achievement {
    apiname: string;
    achieved: number;
    unlocktime: number;
    name?: string;
    description?: string;
}

export interface Game {
    appid: number;
    display_appid?: number;
    custom_header?: string;
    name: string;
    playtime_forever: number;
    playtime_2weeks?: number;
    img_icon_url?: string;
    has_community_visible_stats?: boolean;
    achievements?: Achievement[];
    genres?: string[];
    categories?: string[];
    release_date?: string;
    metacritic_score?: number;
}

export interface Profile {
    avatarfull: string;
    personaname: string;
    personastate: number;
    profileurl: string;
}
