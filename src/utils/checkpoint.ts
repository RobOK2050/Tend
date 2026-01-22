import * as fs from 'fs-extra';
import * as path from 'path';

const CHECKPOINT_FILE = 'tend-checkpoint.txt';

export class CheckpointManager {
  private checkpointPath: string;

  constructor(workingDir: string = process.cwd()) {
    this.checkpointPath = path.join(workingDir, CHECKPOINT_FILE);
  }

  /**
   * Read last processed sequence number from checkpoint file
   * Returns 0 if file doesn't exist
   */
  async getLastSequence(): Promise<number> {
    if (!fs.pathExistsSync(this.checkpointPath)) {
      return 0;
    }

    const content = await fs.readFile(this.checkpointPath, 'utf-8');
    const sequence = parseInt(content.trim(), 10);

    return isNaN(sequence) ? 0 : sequence;
  }

  /**
   * Update checkpoint file with new sequence number
   */
  async updateCheckpoint(sequence: number): Promise<void> {
    await fs.writeFile(this.checkpointPath, sequence.toString(), 'utf-8');
  }

  /**
   * Reset checkpoint (delete file)
   */
  async resetCheckpoint(): Promise<void> {
    if (fs.pathExistsSync(this.checkpointPath)) {
      await fs.unlink(this.checkpointPath);
    }
  }

  /**
   * Get checkpoint file path (for logging)
   */
  getCheckpointPath(): string {
    return this.checkpointPath;
  }
}
