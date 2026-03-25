import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const MAX_VERSIONS = 50

export interface FileVersion {
  id: string
  version: number
  timestamp: number
  content: string
}

export interface VersionMeta {
  id: string
  version: number
  timestamp: number
}

interface VersionsFile {
  filePath: string
  versions: FileVersion[]
}

export class VersionsManager {
  private getVersionsDir(): string {
    return path.join(app.getPath('userData'), 'md-versions')
  }

  private getKey(filePath: string): string {
    return crypto.createHash('sha256').update(filePath).digest('hex')
  }

  private async load(filePath: string): Promise<FileVersion[]> {
    const dir = this.getVersionsDir()
    const key = this.getKey(filePath)
    const vFile = path.join(dir, `${key}.json`)
    try {
      const data = await fs.readFile(vFile, 'utf8')
      const parsed: VersionsFile = JSON.parse(data)
      return parsed.versions ?? []
    } catch {
      return []
    }
  }

  private async persist(filePath: string, versions: FileVersion[]): Promise<void> {
    const dir = this.getVersionsDir()
    await fs.mkdir(dir, { recursive: true })
    const key = this.getKey(filePath)
    const vFile = path.join(dir, `${key}.json`)
    const data: VersionsFile = { filePath, versions }
    await fs.writeFile(vFile, JSON.stringify(data), 'utf8')
  }

  async saveVersion(filePath: string, content: string): Promise<VersionMeta | null> {
    const versions = await this.load(filePath)

    // Skip if content is identical to last version
    if (versions.length > 0 && versions[versions.length - 1].content === content) {
      return null
    }

    const nextVersion = versions.length > 0 ? versions[versions.length - 1].version + 1 : 1
    const now = Date.now()
    const newVersion: FileVersion = {
      id: new Date(now).toISOString(),
      version: nextVersion,
      timestamp: now,
      content,
    }

    versions.push(newVersion)

    // Prune to MAX_VERSIONS (keep most recent)
    const pruned = versions.length > MAX_VERSIONS
      ? versions.slice(versions.length - MAX_VERSIONS)
      : versions

    await this.persist(filePath, pruned)

    return { id: newVersion.id, version: newVersion.version, timestamp: newVersion.timestamp }
  }

  async listVersions(filePath: string): Promise<VersionMeta[]> {
    const versions = await this.load(filePath)
    return versions
      .map(({ id, version, timestamp }) => ({ id, version, timestamp }))
      .reverse() // newest first
  }

  async getVersion(filePath: string, versionId: string): Promise<string | null> {
    const versions = await this.load(filePath)
    const found = versions.find(v => v.id === versionId)
    return found?.content ?? null
  }
}
