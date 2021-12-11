const { readdirSync, statSync } = require('fs');
const { relative, join } = require('path');

const args = process.argv.slice(2);
const argPath = args[0];
const argInterval = parseInt(args[1]);

const cache = {};
let filesChanged = [];
let watchTimeout = undefined;

function CacheEntry({lastModified,
                     path}) {
    this.lastModified = lastModified;
    this.path = path;
}

const cacheEntry = {
    path: undefined,
    modified: undefined,
}

const getLastModified = (path) => {
    return statSync(path).mtime;
}

const isDirectory = (path) => {
    return statSync(path).isDirectory();
}

const readDir = (path, { triggerStrategy }) => {
    for (const childPath of readdirSync(path)) {
        const relativePath = join(path, childPath);
        const absolutePath = join(__dirname, relativePath);
        
        if (cache.hasOwnProperty(absolutePath)) {
            const lastModified = new Date(getLastModified(relativePath)).getTime() / 1000;
            if (lastModified > cache[absolutePath].lastModified) {
                filesChanged.push(absolutePath);
                cache[absolutePath].lastModified = lastModified;
            }
        } else if(isDirectory(relativePath)) {
            readDir(relativePath, {triggerStrategy});
        } else {
            cache[absolutePath] = new CacheEntry({
                lastModified: new Date(getLastModified(relativePath)).getTime() / 1000,
                path: absolutePath
            });
            if (triggerStrategy?.whenNew) {
                filesChanged.push(absolutePath);
            }
        }
    }
}

function watchTimeoutFn() {
    filesChanged = [];

    readDir(argPath, { triggerStrategy: { whenNew: true} });
    if (filesChanged.length) {
        console.log(...filesChanged);
    }
    watchTimeout = setTimeout(watchTimeoutFn, argInterval);
}


readDir(argPath, { triggerStrategy: { whenNew: false} });

watchTimeout = setTimeout(watchTimeoutFn, argInterval);

