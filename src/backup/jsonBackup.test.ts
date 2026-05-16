import { describe, expect, it } from 'vitest'
import { parseBackupFile } from './jsonBackup'

function backupFile(payload: unknown) {
  return new File([JSON.stringify(payload)], 'backup.json', { type: 'application/json' })
}

describe('parseBackupFile', () => {
  it('validates app metadata and normalizes known sticker codes', async () => {
    const parsed = await parseBackupFile(
      backupFile({
        app: 'album-copa-2026-local',
        version: 1,
        albumId: 'panini-fwc-2026',
        exportedAt: '2026-05-15T00:00:00.000Z',
        settings: { albumNickname: 'Teste' },
        inventory: [
          { stickerId: 'bra 1', quantity: 2, updatedAt: '2026-05-15T00:00:00.000Z' },
          { stickerId: 'ZZZ999', quantity: 1 },
          { stickerId: 'BRA2', quantity: 0 },
        ],
      }),
    )

    expect(parsed.payload.inventory).toEqual([
      {
        stickerId: 'BRA1',
        quantity: 2,
        notes: undefined,
        updatedAt: '2026-05-15T00:00:00.000Z',
      },
    ])
    expect(parsed.ignoredItems).toBe(2)
  })

  it('rejects backups from another app', async () => {
    await expect(
      parseBackupFile(
        backupFile({
          app: 'other-app',
          version: 1,
          albumId: 'panini-fwc-2026',
          inventory: [],
        }),
      ),
    ).rejects.toThrow('Arquivo de backup incompativel.')
  })
})
