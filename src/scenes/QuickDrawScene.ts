import Phaser from 'phaser';

export class QuickDrawScene extends Phaser.Scene {
  constructor() {
    super('QuickDrawScene');
  }
  create(): void {
  this.add.text(640, 280, 'Speed Gan', {
    fontSize: '56px',
    color: '#ffffff',
  }).setOrigin(0.5);

  this.add.text(640, 390, 'Enterキーで開始', {
    fontSize: '24px',
    color: '#cccccc',
  }).setOrigin(0.5);
 }
}
