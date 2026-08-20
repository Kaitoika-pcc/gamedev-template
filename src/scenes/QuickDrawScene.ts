import Phaser from 'phaser';

type GameState = 'title' | 'playing' | 'paused' | 'gameOver' | 'clear';

interface EnemyData {
  x: number;
  y: number;
  shape: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  attackTimer: Phaser.Time.TimerEvent;
}

export class QuickDrawScene extends Phaser.Scene {
  private readonly maxHealth = 5;
  private readonly targetDefeats = 20;
  private readonly maxEnemies = 10;
  private readonly enemyRadius = 34;
  private readonly enemyAttackDelay = 2000;

  private state: GameState = 'title';
  private health = this.maxHealth;
  private defeatedCount = 0;
  private enemies: EnemyData[] = [];
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private pointerShape!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private defeatedText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Rectangle;
  private damageFrame!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;

  constructor() {
    super('QuickDrawScene');
  }

  create(): void {
    this.input.mouse?.disableContextMenu();
    this.createBackground();
    this.createHud();
    this.createPointer();

    this.input.on('pointermove', this.updatePointer, this);
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.keyboard?.on('keydown-ENTER', this.handleEnter, this);
    this.input.keyboard?.on('keydown-ESC', this.handleEscape, this);

    this.showTitle();
  }

  private createBackground(): void {
    const background = this.add.graphics();
    background.fillGradientStyle(0x101a2c, 0x1b3047, 0x09101f, 0x10243b, 1, 1, 1, 1);
    background.fillRect(0, 0, 1280, 720);
    background.lineStyle(1, 0x2d4b64, 0.4);

    for (let x = 0; x <= 1280; x += 80) {
      background.lineBetween(x, 0, x, 720);
    }
    for (let y = 0; y <= 720; y += 80) {
      background.lineBetween(0, y, 1280, y);
    }
  }

  private createHud(): void {
    this.statusText = this.add.text(40, 28, '', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#f2c879',
    });
    this.healthText = this.add.text(40, 62, '', this.hudStyle());
    this.defeatedText = this.add.text(1040, 62, '', {
      ...this.hudStyle(),
      align: 'right',
    }).setOrigin(1, 0);

    this.overlay = this.add.rectangle(640, 360, 700, 320, 0x0b1426, 0.95)
      .setStrokeStyle(2, 0x4d7798, 0.9);
    this.damageFrame = this.add.rectangle(640, 360, 1260, 700, 0x000000, 0)
      .setStrokeStyle(12, 0xff3344, 1)
      .setDepth(20)
      .setVisible(false);
    this.titleText = this.add.text(640, 270, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '54px',
      color: '#f5f1e8',
      align: 'center',
    }).setOrigin(0.5);
    this.messageText = this.add.text(640, 395, '', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#a9c1d1',
      align: 'center',
    }).setOrigin(0.5);
  }

  private hudStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#dce8ef',
    };
  }

  private createPointer(): void {
    this.pointerShape = this.add.graphics().setDepth(10);
    this.updatePointer(this.input.activePointer);
  }

  private updatePointer(pointer: Phaser.Input.Pointer): void {
    this.pointerShape.clear();
    this.pointerShape.lineStyle(2, 0xf2c879, 0.95);
    this.pointerShape.strokeCircle(pointer.x, pointer.y, 18);
    this.pointerShape.lineBetween(pointer.x - 28, pointer.y, pointer.x - 8, pointer.y);
    this.pointerShape.lineBetween(pointer.x + 8, pointer.y, pointer.x + 28, pointer.y);
    this.pointerShape.lineBetween(pointer.x, pointer.y - 28, pointer.x, pointer.y - 8);
    this.pointerShape.lineBetween(pointer.x, pointer.y + 8, pointer.x, pointer.y + 28);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.state === 'playing' && pointer.button === 2) {
      this.fire(pointer.x, pointer.y);
    }
  }

  private handleEnter(): void {
    if (this.state === 'title') {
      this.startGame();
    } else if (this.state === 'gameOver' || this.state === 'clear') {
      this.showTitle();
    }
  }

  private handleEscape(): void {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.time.paused = true;
      this.showOverlay('PAUSED', 'Escキーで再開');
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.time.paused = false;
      this.hideOverlay();
    }
  }

  private startGame(): void {
    this.clearEnemies();
    this.state = 'playing';
    this.health = this.maxHealth;
    this.defeatedCount = 0;
    this.updateHud();
    this.hideOverlay();
    this.statusText.setText('TARGETS INCOMING');

    this.spawnEnemy();
    this.spawnTimer = this.time.addEvent({
      delay: 800,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });
  }

  private spawnEnemy(): void {
    if (this.state !== 'playing' || this.enemies.length >= this.maxEnemies) {
      return;
    }

    const x = Phaser.Math.Between(100, 1180);
    const y = Phaser.Math.Between(150, 620);
    const shape = this.add.circle(x, y, this.enemyRadius, 0xd95757)
      .setStrokeStyle(4, 0xffd6a5)
      .setDepth(2);
    const label = this.add.text(x, y - 5, '!', {
      fontFamily: 'Georgia, serif',
      fontSize: '36px',
      color: '#fff4df',
    }).setOrigin(0.5).setDepth(3);

    const enemy: EnemyData = {
      x,
      y,
      shape,
      label,
      attackTimer: this.time.delayedCall(
        this.enemyAttackDelay,
        () => this.enemyAttacks(enemy),
      ),
    };
    this.enemies.push(enemy);
    this.statusText.setText(`TARGETS  ${this.enemies.length} / ${this.maxEnemies}`);
  }

  private fire(x: number, y: number): void {
    const hitEnemy = this.enemies.find((enemy) => {
      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      return distance <= this.enemyRadius;
    });

    if (hitEnemy === undefined) {
      this.statusText.setText('MISSED');
      return;
    }

    hitEnemy.attackTimer.remove();
    hitEnemy.shape.destroy();
    hitEnemy.label.destroy();
    this.enemies = this.enemies.filter((enemy) => enemy !== hitEnemy);
    this.defeatedCount += 1;
    this.health = Math.min(this.maxHealth, this.health + 1);
    this.updateHud();

    if (this.defeatedCount >= this.targetDefeats) {
      this.state = 'clear';
      this.stopSpawnTimer();
      this.showResult('CLEAR', 'Congratulations!\nEnterキーでタイトルへ');
    } else {
      this.statusText.setText(`HIT CONFIRMED  /  TARGETS  ${this.enemies.length}`);
    }
  }

  private enemyAttacks(enemy: EnemyData): void {
    if (this.state !== 'playing' || !this.enemies.includes(enemy)) {
      return;
    }

    enemy.shape.destroy();
    enemy.label.destroy();
    this.enemies = this.enemies.filter((current) => current !== enemy);
    this.health -= 1;
    this.updateHud();
    this.statusText.setText('YOU WERE HIT');
    this.flashDamage();

    if (this.health <= 0) {
      this.state = 'gameOver';
      this.stopSpawnTimer();
      this.showResult('GAME OVER', `撃破数：${this.defeatedCount}\nEnterキーでタイトルへ`);
    }
  }

  private updateHud(): void {
    this.healthText.setText(
      `体力  ${'●'.repeat(this.health)}${'○'.repeat(this.maxHealth - this.health)}`,
    );
    this.defeatedText.setText(`撃破数  ${this.defeatedCount} / ${this.targetDefeats}`);
  }

  private flashDamage(): void {
    this.tweens.killTweensOf(this.damageFrame);
    this.damageFrame.setVisible(true).setAlpha(1);
    this.tweens.add({
      targets: this.damageFrame,
      alpha: 0,
      duration: 350,
      ease: 'Quad.Out',
      onComplete: () => this.damageFrame.setVisible(false),
    });
  }

  private clearEnemies(): void {
    for (const enemy of this.enemies) {
      enemy.attackTimer.remove();
      enemy.shape.destroy();
      enemy.label.destroy();
    }
    this.enemies = [];
  }

  private stopSpawnTimer(): void {
    this.spawnTimer?.remove();
    this.spawnTimer = null;
  }

  private showTitle(): void {
    this.stopSpawnTimer();
    this.clearEnemies();
    this.state = 'title';
    this.time.paused = false;
    this.health = this.maxHealth;
    this.defeatedCount = 0;
    this.updateHud();
    this.showOverlay('SPEED GAN', 'Enterキーで開始\n右クリックで射撃 / Escキーでポーズ');
  }

  private showResult(title: string, message: string): void {
    this.showOverlay(title, message);
    this.pointerShape.setVisible(false);
    this.time.paused = false;
  }

  private showOverlay(title: string, message: string): void {
    this.overlay.setVisible(true);
    this.titleText.setText(title).setVisible(true);
    this.messageText.setText(message).setVisible(true);
    this.pointerShape.setVisible(this.state === 'playing');
  }

  private hideOverlay(): void {
    this.overlay.setVisible(false);
    this.titleText.setVisible(false);
    this.messageText.setVisible(false);
    this.pointerShape.setVisible(true);
  }
}