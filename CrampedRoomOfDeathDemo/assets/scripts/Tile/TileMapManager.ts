import { _decorator, Component, ForwardFlow, Layers, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';
import levels from '../../Levels';
import { createUINode } from '../Utils';
import { TileManager } from './TileManager';
const { ccclass, property } = _decorator;

// export const TILE_WIDTH = 55;
// export const TILE_HEIGHT = 55;

@ccclass('TileMapManager')
export class TileMapManager extends Component {
    async init() {
        const {mapInfo} = levels[`level${1}`];
        const spriteFrames = await this.loadRes();
        console.log(spriteFrames);

        for (let i = 0; i < mapInfo.length; i++) {
            const column = mapInfo[i];
            for (let j = 0; j < column.length; j++) {
                const item = column[j];
                if(item.src === null || item.type === null)
                    continue;

                // 创建Tile
                const tile = createUINode();
                const imgSrc = `tile (${item.src})`;
                const spriteFrame = spriteFrames.find(v => v.name === imgSrc) || spriteFrames[0];

                const tileManager = tile.addComponent(TileManager);
                tileManager.init(spriteFrame,i,j);

                tile.setParent(this.node);
            }
        }
    }

    /**
     * 官方为回调函数写法，不太好写，封装为 Promise
     */
    loadRes(){
        return new Promise<SpriteFrame[]>((resolve,reject)=>{
            resources.loadDir("texture/tile/tile", SpriteFrame, function (err, assets) {
                if(err){
                    reject(err);
                    return;
                }

                resolve(assets);
            });
        })

    }

    start() {

    }

    update(deltaTime: number) {

    }
}

