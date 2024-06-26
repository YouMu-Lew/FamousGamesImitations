import { _decorator, Component, Sprite, UITransform } from 'cc';
import { StateMachine } from './StateMachine';
import {
	DIRECTION_ENUM,
	DIRECTION_ORDER_ENUM,
	ENTITY_STATE_ENUM,
	ENTITY_TYPE_ENUM,
	EVENT_TYPE,
	PARAMS_NAME_ENUM,
} from '../Enums';
import { TILE_HEIGHT, TILE_WIDTH } from '../scripts/Tile/TileManager';
import { IEntity } from '../Levels';
import { randomNumStrByLen } from '../scripts/Utils';
import EventManager from '../Runtime/EventManager';

const { ccclass, property } = _decorator;

export const ENTITY_ID_Len = 12;

@ccclass('EntityManager')
export class EntityManager extends Component {
	x: number = 0;
	y: number = 0;

	fsm: StateMachine;

	public readonly id = randomNumStrByLen(ENTITY_ID_Len);

	private _state: ENTITY_STATE_ENUM = ENTITY_STATE_ENUM.IDLE;
	private _direction: DIRECTION_ENUM = DIRECTION_ENUM.TOP;
	public type: ENTITY_TYPE_ENUM;
	public isDead: boolean = false;

	onAttack(...params): void {}
	onBeHit(...params): void {}

	death(): void {
		this.isDead = true;
		this.state = ENTITY_STATE_ENUM.DEATH;
		EventManager.Instance.emit(EVENT_TYPE.ENTITY_DEATH, this.x, this.y, this.type, this.id);
	}

	get state() {
		return this._state;
	}

	set state(newState: ENTITY_STATE_ENUM) {
		this._state = newState;
		this.fsm.setParams(newState as string as PARAMS_NAME_ENUM, true);
	}

	get direction() {
		return this._direction;
	}

	set direction(newDirection: DIRECTION_ENUM) {
		this._direction = newDirection;
		this.fsm.setParams(PARAMS_NAME_ENUM.DIRECTION, DIRECTION_ORDER_ENUM[newDirection]);
	}

	async init(params: IEntity) {
		const sprite = this.addComponent(Sprite);
		sprite.sizeMode = Sprite.SizeMode.CUSTOM;
		const transform = this.getComponent(UITransform);
		transform.setContentSize(TILE_WIDTH * 4, TILE_HEIGHT * 4);

		this.x = params.x;
		this.y = params.y;
		this.type = params.type;
		this.state = params.state;
		this.direction = params.direction;
	}

	update(): void {
		this.updatePos();
	}

	updatePos() {
		this.node.setPosition((this.x - 1.5) * TILE_WIDTH, -(this.y - 1.5) * TILE_HEIGHT);
	}
}
