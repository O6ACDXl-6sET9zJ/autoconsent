import generateCMPTests from "../playwright/runner";

generateCMPTests('funding-choices', [
    'https://www.schulferien.org/',
    'https://www.bbc.com/',
    'https://www.accuweather.com/',
    'https://hbr.org/',
    "https://www.dinarguru.com/",
    "https://blog.alltolearn.com/",
], {
    skipRegions: ["US", "GB"]
});
