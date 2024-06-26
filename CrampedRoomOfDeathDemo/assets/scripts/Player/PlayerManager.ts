import { _decorator, error } from 'cc';
import { CONTROLLER_EVENT, DIRECTION_ENUM, ENTITY_STATE_ENUM, ENTITY_TYPE_ENUM, EVENT_TYPE } from '../../Enums';
import EventManager from '../../Runtime/EventManager';
import { PlayerStateMachine } from './PlayerStateMachine';
import { EntityManager } from '../../Base/EntityManager';
import DataManager from '../../Runtime/DataManager';
import { IEntity } from '../../Levels';
const { ccclass, property } = _decorator;

@ccclass('PlayerManager')
export class PlayerManager extends EntityManager {
	targetX: number = 0;
	targetY: number = 0;

	// fsm: PlayerStateMachine;

	private readonly speed: number = 0.1;
	private isMoving: boolean = false;

	async init(params: IEntity) {
		this.fsm = this.addComponent(PlayerStateMachine);
		await this.fsm.init();
		super.init(params);

		this.targetX = this.x;
		this.targetY = this.y;

		this.registerEvents();
	}

	registerEvents() {
		EventManager.Instance.on(EVENT_TYPE.PLAYER_CONTROL, this.inputHandle, this);
		EventManager.Instance.on(EVENT_TYPE.ENEMY_ATTACK, this.onBeHit, this);
	}

	protected onDestroy(): void {
		this.unregisterEvents();
	}

	unregisterEvents() {
		EventManager.Instance.off(EVENT_TYPE.PLAYER_CONTROL, this.inputHandle);
		EventManager.Instance.off(EVENT_TYPE.ENEMY_ATTACK, this.onBeHit);
	}

	update(): void {
		if (!this.isMoving && (this.x != this.targetX || this.y != this.targetY)) this.isMoving = true;
		if (this.isMoving) {
			this.updateXY();
		}
		super.update();
	}

	updateXY() {
		if (Math.abs(this.x - this.targetX) <= this.speed) this.x = this.targetX;
		else {
			if (this.x > this.targetX) this.x -= this.speed;
			if (this.x < this.targetX) this.x += this.speed;
		}
		if (Math.abs(this.y - this.targetY) <= this.speed) this.y = this.targetY;
		else {
			if (this.y > this.targetY) this.y -= this.speed;
			if (this.y < this.targetY) this.y += this.speed;
		}
		if (this.x === this.targetX && this.y === this.targetY) {
			this.isMoving = false;
			EventManager.Instance.emit(EVENT_TYPE.PLAYER_MOVE_END);
		}
	}

	inputHandle(inputDirection: CONTROLLER_EVENT) {
		if (this.state !== ENTITY_STATE_ENUM.IDLE || this.isMoving) return;

		if (this.canAttack(inputDirection)) {
			return;
		}

		if (!this.canMove(inputDirection)) {
			// be blocked
			switch (inputDirection) {
				case CONTROLLER_EVENT.TOP:
					this.state = ENTITY_STATE_ENUM.BLOCKFRONT;
					break;
				case CONTROLLER_EVENT.BOTTOM:
					this.state = ENTITY_STATE_ENUM.BLOCKBACK;
					break;
				case CONTROLLER_EVENT.LEFT:
					this.state = ENTITY_STATE_ENUM.BLOCKLEFT;
					break;
				case CONTROLLER_EVENT.RIGHT:
					this.state = ENTITY_STATE_ENUM.BLOCKRIGHT;
					break;
				case CONTROLLER_EVENT.TURNLEFT:
					this.state = ENTITY_STATE_ENUM.BLOCKTURNLEFT;
					break;
				case CONTROLLER_EVENT.TURNRIGHT:
					this.state = ENTITY_STATE_ENUM.BLOCKTURNRIGHT;
					break;
			}
			return;
		}
		// can move
		else {
			this.move(inputDirection);
		}
	}

	onBeHit(type: ENTITY_STATE_ENUM) {
		this.isDead = true;
		this.state = type;
	}

	canAttack(inputDirection: CONTROLLER_EVENT): boolean {
		if (inputDirection === CONTROLLER_EVENT.TURNLEFT || inputDirection === CONTROLLER_EVENT.TURNRIGHT) return false;
		let attackPoint = this.XYMove(this.getWeaponPos(), inputDirection);
		const enemies = DataManager.Instance.enemies.filter(enemy => enemy.type === ENTITY_TYPE_ENUM.ENEMY);
		for (let i = 0; i < enemies.length; i++) {
			const enemy = enemies[i];
			if (enemy.x === attackPoint[0] && enemy.y === attackPoint[1]) {
				this.onAttack(enemy.id);
				return true;
			}
		}
		return false;
	}

	onAttack(enemyId: string) {
		this.state = ENTITY_STATE_ENUM.ATTACK;
		EventManager.Instance.emit(EVENT_TYPE.PLAYER_ATTACK, enemyId);
	}

	canMove(inputDirection: CONTROLLER_EVENT): boolean {
		const tileInfo = DataManager.Instance.tileInfo;
		// 用 targetXY 确定 xy 防止在移动过程中 xy 为小数
		const { targetX: x, targetY: y, direction } = this;
		let [weaponX, weaponY] = this.getWeaponPos();

		if (inputDirection === CONTROLLER_EVENT.TURNLEFT || inputDirection === CONTROLLER_EVENT.TURNRIGHT) {
			// 转向
			let checkList = [
				[x, y],
				[weaponX, weaponY],
			];
			if (inputDirection === CONTROLLER_EVENT.TURNLEFT) {
				// 左转
				switch (direction) {
					case DIRECTION_ENUM.TOP:
						checkList[0][0]--;
						checkList[1][0]--;
						break;
					case DIRECTION_ENUM.BOTTOM:
						checkList[0][0]++;
						checkList[1][0]++;
						break;
					case DIRECTION_ENUM.LEFT:
						checkList[0][1]++;
						checkList[1][1]++;
						break;
					case DIRECTION_ENUM.RIGHT:
						checkList[0][1]--;
						checkList[1][1]--;
						break;
				}
			} else {
				// 右转
				switch (direction) {
					case DIRECTION_ENUM.TOP:
						checkList[0][0]++;
						checkList[1][0]++;
						break;
					case DIRECTION_ENUM.BOTTOM:
						checkList[0][0]--;
						checkList[1][0]--;
						break;
					case DIRECTION_ENUM.LEFT:
						checkList[0][1]--;
						checkList[1][1]--;
						break;
					case DIRECTION_ENUM.RIGHT:
						checkList[0][1]++;
						checkList[1][1]++;
						break;
				}
			}
			// 目标地块不存在，即地图边界外，可以转
			if ((!tileInfo[checkList[0][0]] || !tileInfo[checkList[0][0]][checkList[0][1]]) && (!tileInfo[checkList[1][0]] || !tileInfo[checkList[1][0]][checkList[1][1]]))
				return true;
			return (
				tileInfo[checkList[0][0]][checkList[0][1]].turnable &&
				tileInfo[checkList[1][0]][checkList[1][1]].turnable
			);
		} else {
			// 移动
			let checkMovePos: [number, number] = [x, y];
			let checkTurnPos: [number, number] = [weaponX, weaponY];
			this.XYMove(checkMovePos, inputDirection);
			this.XYMove(checkTurnPos, inputDirection);
			// 目标地块不存在，即地图边界外,不可移动
			if (!tileInfo[checkMovePos[0]] || !tileInfo[checkMovePos[0]][checkMovePos[1]]) {
				const bursts = DataManager.Instance.bursts;
				// 遍历 bursts
				for (let i = 0; i < bursts.length; i++) {
					const burst = bursts[i];
					if (burst.x === checkMovePos[0] && burst.y === checkMovePos[1]) {
						return true;
					}
				}
				return false;
			}
			if (!tileInfo[checkMovePos[0]][checkMovePos[1]].moveable) return false;
			if (!tileInfo[checkTurnPos[0]] || !tileInfo[checkTurnPos[0]][checkTurnPos[1]]) return true;
			return tileInfo[checkTurnPos[0]][checkTurnPos[1]].turnable;
		}
	}

	move(inputDirection: CONTROLLER_EVENT) {
		switch (inputDirection) {
			case CONTROLLER_EVENT.TOP:
				EventManager.Instance.emit(EVENT_TYPE.PLAYER_MOVE, this.targetX,this.targetY,DIRECTION_ENUM.TOP);
				this.targetY--;
				break;
			case CONTROLLER_EVENT.BOTTOM:
				EventManager.Instance.emit(EVENT_TYPE.PLAYER_MOVE, this.targetX,this.targetY,DIRECTION_ENUM.BOTTOM);
				this.targetY++;
				break;
			case CONTROLLER_EVENT.LEFT:
				EventManager.Instance.emit(EVENT_TYPE.PLAYER_MOVE, this.targetX,this.targetY,DIRECTION_ENUM.LEFT);
				this.targetX--;
				break;
			case CONTROLLER_EVENT.RIGHT:
				EventManager.Instance.emit(EVENT_TYPE.PLAYER_MOVE, this.targetX,this.targetY,DIRECTION_ENUM.RIGHT);
				this.targetX++;
				break;
			case CONTROLLER_EVENT.TURNLEFT:
				switch (this.direction) {
					case DIRECTION_ENUM.TOP:
						this.direction = DIRECTION_ENUM.LEFT;
						break;
					case DIRECTION_ENUM.LEFT:
						this.direction = DIRECTION_ENUM.BOTTOM;
						break;
					case DIRECTION_ENUM.BOTTOM:
						this.direction = DIRECTION_ENUM.RIGHT;
						break;
					case DIRECTION_ENUM.RIGHT:
						this.direction = DIRECTION_ENUM.TOP;
						break;
				}
				this.state = ENTITY_STATE_ENUM.TURNLEFT;
				break;
			case CONTROLLER_EVENT.TURNRIGHT:
				switch (this.direction) {
					case DIRECTION_ENUM.TOP:
						this.direction = DIRECTION_ENUM.RIGHT;
						break;
					case DIRECTION_ENUM.RIGHT:
						this.direction = DIRECTION_ENUM.BOTTOM;
						break;
					case DIRECTION_ENUM.BOTTOM:
						this.direction = DIRECTION_ENUM.LEFT;
						break;
					case DIRECTION_ENUM.LEFT:
						this.direction = DIRECTION_ENUM.TOP;
						break;
				}
				this.state = ENTITY_STATE_ENUM.TURNRIGHT;
				break;
		}
	}

	getWeaponPos(): [weaponX: number, weaponY: number] {
		return this.XYMove([this.x, this.y], this.direction);
	}

	XYMove(pos: [number, number], direction: DIRECTION_ENUM | CONTROLLER_EVENT) {
		if (direction === CONTROLLER_EVENT.TURNLEFT || direction === CONTROLLER_EVENT.TURNRIGHT) {
			error('错误的参数传递');
			return;
		}
		switch (direction) {
			case DIRECTION_ENUM.TOP || CONTROLLER_EVENT.TOP:
				pos[1]--;
				break;
			case DIRECTION_ENUM.BOTTOM || CONTROLLER_EVENT.BOTTOM:
				pos[1]++;
				break;
			case DIRECTION_ENUM.LEFT || CONTROLLER_EVENT.LEFT:
				pos[0]--;
				break;
			case DIRECTION_ENUM.RIGHT || CONTROLLER_EVENT.RIGHT:
				pos[0]++;
				break;
		}
		return pos;
	}
}
