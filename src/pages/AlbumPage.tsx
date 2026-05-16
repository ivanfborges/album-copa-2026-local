import { Check, Minus, Plus, Search } from 'lucide-react'
import { filterOptions, stickerTypeLabels } from '../app/catalog'
import { FlagIcon } from '../components/FlagIcon'
import { stickers } from '../data/catalog'
import type { InventoryItem, SectionStats, Sticker, StickerFilter, StickerSection } from '../types'

type AlbumPageProps = {
  selectedSection?: StickerSection
  selectedSectionCode: string
  albumSearch: string
  stickerFilter: StickerFilter
  visibleStickers: readonly Sticker[]
  sectionsWithStats: SectionStats[]
  inventoryByStickerId: Map<string, InventoryItem>
  onSearchChange: (value: string) => void
  onFilterChange: (filter: StickerFilter) => void
  onSectionChange: (sectionCode: string) => void
  onStickerQuantityChange: (stickerId: string, quantity: number) => void
}

export function AlbumPage({
  selectedSection,
  selectedSectionCode,
  albumSearch,
  stickerFilter,
  visibleStickers,
  sectionsWithStats,
  inventoryByStickerId,
  onSearchChange,
  onFilterChange,
  onSectionChange,
  onStickerQuantityChange,
}: AlbumPageProps) {
  return (
    <section className="page-band">
      <div className="page-header">
        <div>
          <p className="eyebrow">Catalogo</p>
          <h2>{selectedSection ? selectedSection.name : 'Todas as figurinhas'}</h2>
        </div>
        <span className="count-pill">{stickers.length} cromos</span>
      </div>

      <section className="tool-panel album-toolbar">
        <div className="album-controls">
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={albumSearch}
              placeholder="Buscar por codigo, nome ou selecao"
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>

          <div className="filter-tabs" aria-label="Filtro de figurinhas">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={stickerFilter === option.id ? 'active' : ''}
                onClick={() => onFilterChange(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <span className="meta-line">
          {visibleStickers.length} de {stickers.length} cromos exibidos
        </span>
      </section>

      <div className="album-layout">
        <aside className="section-sidebar" aria-label="Secoes do album">
          <button
            type="button"
            className={selectedSectionCode === 'all' ? 'section-button active' : 'section-button'}
            onClick={() => onSectionChange('all')}
          >
            <FlagIcon sectionCode="ALL" label="Todas as secoes" className="section-flag" />
            <span className="team-code">ALL</span>
            <span>
              <strong>Todas</strong>
              <small>{stickers.length} cromos</small>
            </span>
          </button>

          {sectionsWithStats.map((section) => (
            <button
              key={section.code}
              type="button"
              className={selectedSectionCode === section.code ? 'section-button active' : 'section-button'}
              onClick={() => onSectionChange(section.code)}
            >
              <FlagIcon sectionCode={section.code} label={section.name} className="section-flag" />
              <span className="team-code">{section.code}</span>
              <span>
                <strong>{section.name}</strong>
                <small>
                  {section.group ? `Grupo ${section.group} - ` : ''}
                  {section.owned}/{section.total} cromos
                </small>
              </span>
            </button>
          ))}
        </aside>

        <section className="sticker-panel" aria-label="Figurinhas">
          <div className="sticker-grid">
            {visibleStickers.map((sticker) => {
              const quantity = inventoryByStickerId.get(sticker.id)?.quantity ?? 0
              const status = quantity > 1 ? 'Repetida' : quantity === 1 ? 'Tenho' : 'Faltante'

              return (
                <article
                  key={sticker.id}
                  className={
                    quantity > 1
                      ? 'sticker-card repeated'
                      : quantity === 1
                        ? 'sticker-card owned'
                        : 'sticker-card'
                  }
                >
                  <div className="sticker-card-header">
                    <span className="sticker-code">{sticker.displayCode}</span>
                    {sticker.isSpecial && <span className="special-pill">Foil</span>}
                  </div>
                  <strong>{sticker.title}</strong>
                  <span className="sticker-meta">
                    <FlagIcon
                      sectionCode={sticker.sectionCode}
                      label={sticker.sectionName}
                      className="inline-flag"
                    />
                    {sticker.sectionName} - {stickerTypeLabels[sticker.type]}
                  </span>
                  <span
                    className={
                      quantity > 1 ? 'status-pill repeated' : quantity > 0 ? 'status-pill owned' : 'status-pill'
                    }
                  >
                    {status}
                  </span>
                  <div className="quantity-control" aria-label={`Quantidade de ${sticker.displayCode}`}>
                    <button
                      type="button"
                      title="Diminuir quantidade"
                      onClick={() => onStickerQuantityChange(sticker.id, quantity - 1)}
                      disabled={quantity === 0}
                    >
                      <Minus size={16} aria-hidden="true" />
                    </button>
                    <strong>{quantity}</strong>
                    <button
                      type="button"
                      title="Aumentar quantidade"
                      onClick={() => onStickerQuantityChange(sticker.id, quantity + 1)}
                    >
                      <Plus size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      title={quantity > 0 ? 'Marcar como faltante' : 'Marcar como tenho'}
                      onClick={() => onStickerQuantityChange(sticker.id, quantity > 0 ? 0 : 1)}
                    >
                      <Check size={16} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </section>
  )
}
