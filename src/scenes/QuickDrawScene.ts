import Phaser from 'phaser';

type GameState = 'title' | 'playing' | 'warning' | 'boss' | 'paused' | 'gameOver' | 'clear';

interface EnemyData {
  x: number;
  y: number;
  shape: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  attackTimer: Phaser.Time.TimerEvent;
}

interface EnemyBullet {
  shape: Phaser.GameObjects.Arc;
  velocityX: number;
  velocityY: number;
}

interface BossData {
  shape: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  bulletTimer: Phaser.Time.TimerEvent;
  areaTimer: Phaser.Time.TimerEvent;
  health: number;
}

export class QuickDrawScene extends Phaser.Scene {
  private readonly maxHealth = 10;
  private readonly targetDefeats = 100;
  private readonly maxEnemies = 10;
  private readonly enemyRadius = 34;
  private readonly enemyAttackDelay = 2000;
  private readonly playerRadius = 24;
  private readonly playerSpeed = 144;
  private readonly bulletRadius = 8;
  private readonly bulletSpeed = 300;
  private readonly bossBulletSpeed = this.bulletSpeed * 1.5;
  private readonly bossSize = 300;
  private readonly bossMaxHealth = 100;

  private state: GameState = 'title';
  private health = this.maxHealth;
  private defeatedCount = 0;
  private enemies: EnemyData[] = [];
  private bullets: EnemyBullet[] = [];
  private bossBullets: EnemyBullet[] = [];
  private boss: BossData | null = null;
  private warningText!: Phaser.GameObjects.Text;
  private bossHealthBackground!: Phaser.GameObjects.Rectangle;
  private bossHealthFill!: Phaser.GameObjects.Rectangle;
  private areaEffect!: Phaser.GameObjects.Arc;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private player!: Phaser.GameObjects.Arc;
  private playerShip!: Phaser.GameObjects.Graphics;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
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
    this.createPlayer();
    this.createPointer();

    this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.input.on('pointermove', this.updatePointer, this);
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.keyboard?.on('keydown-ENTER', this.handleEnter, this);
    this.input.keyboard?.on('keydown-ESC', this.handleEscape, this);

    this.showTitle();
  }

  update(_time: number, delta: number): void {
    if (this.state !== 'playing' && this.state !== 'boss') {
      return;
    }

    this.movePlayer(delta / 1000);
    this.updateBullets(delta / 1000);
    if (this.state === 'boss') {
      this.updateBossBullets(delta / 1000);
    }
  }

  private createBackground(): void {
    const background = this.add.graphics();
    background.fillGradientStyle(0x080d2b, 0x151347, 0x030617, 0x08152f, 1, 1, 1, 1);
    background.fillRect(0, 0, 1280, 720);

    for (let index = 0; index < 90; index += 1) {
      const x = Phaser.Math.Between(20, 1260);
      const y = Phaser.Math.Between(20, 700);
      const radius = Phaser.Math.Between(1, 2);
      background.fillStyle(index % 5 === 0 ? 0x8edbff : 0xffffff, 0.7);
      background.fillCircle(x, y, radius);
    }

    const earth = this.add.circle(1040, 170, 190, 0x16769c, 0.95)
      .setStrokeStyle(8, 0x76e5ff, 0.65)
      .setDepth(-4);
    const earthSurface = this.add.graphics().setDepth(-3);
    earthSurface.fillStyle(0x248d62, 0.9);
    earthSurface.fillEllipse(980, 110, 95, 55);
    earthSurface.fillEllipse(1080, 205, 130, 72);
    earthSurface.fillEllipse(1000, 260, 70, 45);
    earthSurface.fillStyle(0x53b978, 0.55);
    earthSurface.fillEllipse(1120, 95, 55, 35);
    earthSurface.fillEllipse(950, 185, 45, 80);
    earthSurface.lineStyle(5, 0xb8f5ff, 0.25);
    earthSurface.strokeCircle(1040, 170, 198);

    const motionLines = this.add.graphics().setDepth(-2);
    motionLines.lineStyle(4, 0x48bdf2, 0.55);
    motionLines.lineBetween(30, 600, 340, 460);
    motionLines.lineBetween(0, 520, 260, 405);
    motionLines.lineBetween(230, 700, 470, 565);
    motionLines.lineStyle(3, 0xffe66d, 0.85);
    motionLines.lineBetween(80, 650, 290, 555);
    motionLines.lineBetween(360, 720, 520, 635);
    motionLines.lineBetween(720, 700, 880, 620);

    const atmosphere = this.add.graphics().setDepth(-1);
    atmosphere.lineStyle(3, 0x7eeeff, 0.35);
    atmosphere.strokeCircle(1040, 170, 210);
    atmosphere.strokeCircle(1040, 170, 220);
    atmosphere.lineStyle(2, 0xffffff, 0.3);
    atmosphere.arc(1040, 170, 230, Phaser.Math.DegToRad(160), Phaser.Math.DegToRad(330), false);

    if (earth.visible === false) {
      earth.setVisible(true);
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
    this.warningText = this.add.text(640, 150, 'WARNING', {
      fontFamily: 'sans-serif',
      fontSize: '64px',
      color: '#ff3344',
      fontStyle: 'bold',
      stroke: '#240008',
      strokeThickness: 8,
      align: 'center',
    }).setOrigin(0.5).setDepth(15).setVisible(false);
    this.bossHealthBackground = this.add.rectangle(490, 475, 300, 20, 0x351521)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xffc0c0)
      .setDepth(12)
      .setVisible(false);
    this.bossHealthFill = this.add.rectangle(490, 475, 300, 20, 0xe53935)
      .setOrigin(0, 0.5)
      .setDisplaySize(0, 20)
      .setDepth(13)
      .setVisible(false);
    this.areaEffect = this.add.circle(640, 360, 150, 0xff304f, 0.35)
      .setStrokeStyle(6, 0xff3344, 0.95)
      .setDepth(9)
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

  private createPlayer(): void {
    this.player = this.add.circle(640, 360, this.playerRadius, 0x4ecdc4, 0)
      .setStrokeStyle(0, 0x000000, 0)
      .setDepth(1);
    this.playerShip = this.add.graphics().setDepth(5);
    this.drawPlayerShip();
    this.playerShip.setPosition(640, 360);
  }

  private drawPlayerShip(): void {
    this.playerShip.clear();
    this.playerShip.fillStyle(0xffffff, 1);
    this.playerShip.fillCircle(0, 0, this.playerRadius);
    this.playerShip.lineStyle(3, 0xd9f7ff, 1);
    this.playerShip.strokeCircle(0, 0, this.playerRadius);

    // 白い円の中央にある小さな水色の円
    this.playerShip.fillStyle(0x63d4d7, 1);
    this.playerShip.fillCircle(0, 0, 9);
    this.playerShip.lineStyle(2, 0x2d8f9f, 1);
    this.playerShip.strokeCircle(0, 0, 9);
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
    if ((this.state === 'playing' || this.state === 'boss') && pointer.button === 2) {
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
    if (this.state === 'playing' || this.state === 'boss') {
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
    this.clearBullets();
    this.clearBoss();
    this.warningText.setVisible(false);
    this.areaEffect.setVisible(false);
    this.state = 'playing';
    this.health = this.maxHealth;
    this.defeatedCount = 0;
    this.updateHud();
    this.hideOverlay();
    this.player.setPosition(640, 360).setVisible(true);
    this.statusText.setText('TARGETS INCOMING');

    this.spawnEnemy();
    this.spawnTimer = this.time.addEvent({
      delay: this.getSpawnDelay(),
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });
  }

  private getSpawnDelay(): number {
    const reduction = this.defeatedCount >= 60
      ? 1000
      : this.defeatedCount >= 40
        ? 500
        : this.defeatedCount >= 20
          ? 250
          : 0;

    return Math.max(100, 800 - reduction);
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
    if (this.state === 'boss') {
      this.damageBoss(x, y);
      return;
    }

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

    if (this.defeatedCount === 99) {
      this.beginBossWarning();
    } else if (this.defeatedCount >= 20 && this.defeatedCount % 20 === 0) {
      this.restartSpawnTimer();
    } else {
      this.statusText.setText(`HIT CONFIRMED  /  TARGETS  ${this.enemies.length}`);
    }
  }

  private restartSpawnTimer(): void {
    this.stopSpawnTimer();
    this.spawnTimer = this.time.addEvent({
      delay: this.getSpawnDelay(),
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });
  }

  private beginBossWarning(): void {
    this.stopSpawnTimer();
    this.clearEnemies();
    this.clearBullets();
    this.state = 'warning';
    this.warningText.setVisible(true).setText('WARNING');
    this.statusText.setText('BOSS INCOMING');
    this.time.delayedCall(3000, this.startBoss, [], this);
  }

  private startBoss(): void {
    if (this.state !== 'warning') {
      return;
    }

    this.state = 'boss';
    this.warningText.setVisible(false);
    const shape = this.add.rectangle(640, 270, this.bossSize, this.bossSize, 0x6f1d3a)
      .setStrokeStyle(8, 0xff5c7a)
      .setDepth(2);
    const label = this.add.text(640, 260, 'BOSS', {
      fontFamily: 'Georgia, serif',
      fontSize: '42px',
      color: '#ffe1e8',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(3);
    const boss: BossData = {
      shape,
      label,
      health: this.bossMaxHealth,
      bulletTimer: this.time.addEvent({
        delay: 300,
        callback: () => this.fireBossBullet(boss),
        loop: true,
      }),
      areaTimer: this.time.addEvent({
        delay: 10000,
        callback: () => this.fireBossAreaAttack(),
        loop: true,
      }),
    };
    this.boss = boss;
    this.bossHealthBackground.setVisible(true);
    this.bossHealthFill.setVisible(true);
    this.updateBossHealthBar();
    this.statusText.setText('BOSS BATTLE');
  }

  private fireBossBullet(boss: BossData): void {
    if (this.state !== 'boss' || this.boss !== boss) {
      return;
    }

    const direction = new Phaser.Math.Vector2(
      this.player.x - boss.shape.x,
      this.player.y - boss.shape.y,
    ).normalize();
    const bullet = this.add.circle(boss.shape.x, boss.shape.y, this.bulletRadius, 0xffd166)
      .setStrokeStyle(2, 0xffffff)
      .setDepth(4);
    this.bossBullets.push({
      shape: bullet,
      velocityX: direction.x * this.bossBulletSpeed,
      velocityY: direction.y * this.bossBulletSpeed,
    });
  }

  private fireBossAreaAttack(): void {
    if (this.state !== 'boss') {
      return;
    }

    this.areaEffect.setPosition(this.player.x, this.player.y).setVisible(true).setScale(0.2);
    this.tweens.add({
      targets: this.areaEffect,
      scale: 1,
      alpha: 0,
      duration: 700,
      ease: 'Quad.Out',
      onComplete: () => {
        this.areaEffect.setVisible(false).setAlpha(1);
        if (this.state === 'boss') {
          this.health = Math.max(0, this.health - 2);
          this.updateHud();
          this.flashDamage();
          if (this.health <= 0) {
            this.endGame('GAME OVER', `撃破数：${this.defeatedCount}\nEnterキーでタイトルへ`);
          }
        }
      },
    });
  }

  private damageBoss(x: number, y: number): void {
    if (this.boss === null) {
      return;
    }

    const hit = Phaser.Geom.Rectangle.Contains(this.boss.shape.getBounds(), x, y);
    if (!hit) {
      this.statusText.setText('MISSED');
      return;
    }

    this.boss.health -= 1;
    this.updateBossHealthBar();
    if (this.boss.health <= 0) {
      this.defeatedCount = this.targetDefeats;
      this.endGame('CLEAR', 'Congratulations!\nEnterキーでタイトルへ');
    }
  }

  private updateBossHealthBar(): void {
    if (this.boss === null) {
      return;
    }

    const damageRatio = 1 - this.boss.health / this.bossMaxHealth;
    this.bossHealthFill.setDisplaySize(300 * damageRatio, 20);
  }

  private enemyAttacks(enemy: EnemyData): void {
    if (this.state !== 'playing' || !this.enemies.includes(enemy)) {
      return;
    }

    const direction = new Phaser.Math.Vector2(
      this.player.x - enemy.x,
      this.player.y - enemy.y,
    ).normalize();
    const bullet = this.add.circle(enemy.x, enemy.y, this.bulletRadius, 0xff9f43)
      .setStrokeStyle(2, 0xfff0bd)
      .setDepth(2);
    this.bullets.push({
      shape: bullet,
      velocityX: direction.x * this.bulletSpeed,
      velocityY: direction.y * this.bulletSpeed,
    });

    enemy.shape.destroy();
    enemy.label.destroy();
    this.enemies = this.enemies.filter((current) => current !== enemy);
    this.statusText.setText('INCOMING FIRE');
  }

  private movePlayer(seconds: number): void {
    let directionX = 0;
    let directionY = 0;

    if (this.keyA.isDown) directionX -= 1;
    if (this.keyD.isDown) directionX += 1;
    if (this.keyW.isDown) directionY -= 1;
    if (this.keyS.isDown) directionY += 1;

    if (directionX !== 0 || directionY !== 0) {
      const direction = new Phaser.Math.Vector2(directionX, directionY).normalize();
      this.player.x += direction.x * this.playerSpeed * seconds;
      this.player.y += direction.y * this.playerSpeed * seconds;
    }

    this.player.x = Phaser.Math.Clamp(this.player.x, this.playerRadius, 1280 - this.playerRadius);
    this.player.y = Phaser.Math.Clamp(this.player.y, this.playerRadius, 720 - this.playerRadius);
    this.playerShip.setPosition(this.player.x, this.player.y);
  }

  private updateBullets(seconds: number): void {
    const remainingBullets: EnemyBullet[] = [];

    for (const bullet of this.bullets) {
      bullet.shape.x += bullet.velocityX * seconds;
      bullet.shape.y += bullet.velocityY * seconds;

      const distance = Phaser.Math.Distance.Between(
        bullet.shape.x,
        bullet.shape.y,
        this.player.x,
        this.player.y,
      );
      const hitPlayer = distance <= this.playerRadius + this.bulletRadius;
      const outsideScreen = bullet.shape.x < -this.bulletRadius
        || bullet.shape.x > 1280 + this.bulletRadius
        || bullet.shape.y < -this.bulletRadius
        || bullet.shape.y > 720 + this.bulletRadius;

      if (hitPlayer) {
        bullet.shape.destroy();
        this.takeBulletDamage();
      } else if (outsideScreen) {
        bullet.shape.destroy();
      } else {
        remainingBullets.push(bullet);
      }
    }

    this.bullets = remainingBullets;
  }

  private updateBossBullets(seconds: number): void {
    const remainingBullets: EnemyBullet[] = [];

    for (const bullet of this.bossBullets) {
      bullet.shape.x += bullet.velocityX * seconds;
      bullet.shape.y += bullet.velocityY * seconds;
      const distance = Phaser.Math.Distance.Between(
        bullet.shape.x,
        bullet.shape.y,
        this.player.x,
        this.player.y,
      );
      const outsideScreen = bullet.shape.x < -this.bulletRadius
        || bullet.shape.x > 1280 + this.bulletRadius
        || bullet.shape.y < -this.bulletRadius
        || bullet.shape.y > 720 + this.bulletRadius;

      if (distance <= this.playerRadius + this.bulletRadius) {
        bullet.shape.destroy();
        this.takeBulletDamage();
      } else if (outsideScreen) {
        bullet.shape.destroy();
      } else {
        remainingBullets.push(bullet);
      }
    }

    this.bossBullets = remainingBullets;
  }

  private takeBulletDamage(): void {
    if (this.state !== 'playing') {
      return;
    }

    this.health = Math.max(0, this.health - 2);
    this.updateHud();
    this.statusText.setText('YOU WERE HIT');
    this.flashDamage();

    if (this.health <= 0) {
      this.endGame('GAME OVER', `撃破数：${this.defeatedCount}\nEnterキーでタイトルへ`);
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

  private clearBullets(): void {
    for (const bullet of this.bullets) {
      bullet.shape.destroy();
    }
    this.bullets = [];
    for (const bullet of this.bossBullets) {
      bullet.shape.destroy();
    }
    this.bossBullets = [];
  }

  private clearBoss(): void {
    if (this.boss !== null) {
      this.boss.bulletTimer.remove();
      this.boss.areaTimer.remove();
      this.boss.shape.destroy();
      this.boss.label.destroy();
      this.boss = null;
    }
    this.bossHealthBackground.setVisible(false);
    this.bossHealthFill.setVisible(false);
    this.areaEffect.setVisible(false);
  }

  private stopSpawnTimer(): void {
    this.spawnTimer?.remove();
    this.spawnTimer = null;
  }

  private showTitle(): void {
    this.stopSpawnTimer();
    this.clearEnemies();
    this.clearBullets();
    this.clearBoss();
    this.state = 'title';
    this.time.paused = false;
    this.health = this.maxHealth;
    this.defeatedCount = 0;
    this.player.setVisible(false);
      this.playerShip.setVisible(false);
    this.updateHud();
    this.showOverlay('SPEED GAN', 'Enterキーで開始\n右クリックで射撃 / Escキーでポーズ');
  }

  private endGame(title: string, message: string): void {
    this.state = title === 'CLEAR' ? 'clear' : 'gameOver';
    this.stopSpawnTimer();
    this.clearBullets();
    this.clearBoss();
    this.showResult(title, message);
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