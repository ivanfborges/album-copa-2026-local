import { Check, Minus, Plus, Search } from 'lucide-react'
import { filterOptions } from '../app/catalog'
import { FlagIcon } from '../components/FlagIcon'
import { stickers } from '../data/catalog'
import { worldCupGroups } from '../data/groups'
import type { AlbumStickerFilter, InventoryItem, SectionStats, Sticker, StickerSection } from '../types'

const albumFilterOptions: Array<{ id: AlbumStickerFilter; label: string }> = filterOptions.filter(
  (option): option is { id: AlbumStickerFilter; label: string } => option.id !== 'special',
)

type AlbumPageProps = {
  selectedSection?: StickerSection
  selectedSectionCode: string
  albumSearch: string
  stickerFilter: AlbumStickerFilter
  showSpecialStickersOnly: boolean
  visibleStickers: readonly Sticker[]
  sectionsWithStats: SectionStats[]
  inventoryByStickerId: Map<string, InventoryItem>
  onSearchChange: (value: string) => void
  onFilterChange: (filter: AlbumStickerFilter) => void
  onSpecialFilterToggle: () => void
  onSectionChange: (sectionCode: string) => void
  onStickerQuantityChange: (stickerId: string, quantity: number) => void
}

export function AlbumPage({
  selectedSection,
  selectedSectionCode,
  albumSearch,
  stickerFilter,
  showSpecialStickersOnly,
  visibleStickers,
  sectionsWithStats,
  inventoryByStickerId,
  onSearchChange,
  onFilterChange,
  onSpecialFilterToggle,
  onSectionChange,
  onStickerQuantityChange,
}: AlbumPageProps) {
  const sectionsByCode = new Map(sectionsWithStats.map((section) => [section.code, section]))
  const ownedTotal = stickers.reduce(
    (total, sticker) => total + ((inventoryByStickerId.get(sticker.id)?.quantity ?? 0) > 0 ? 1 : 0),
    0,
  )
  const mainSections = ['PANINI', 'FWC']
    .map((sectionCode) => sectionsByCode.get(sectionCode))
    .filter((section): section is SectionStats => Boolean(section))
  const groupedSections = worldCupGroups.map((group) => ({
    group: group.group,
    sections: group.codes
      .map((sectionCode) => sectionsByCode.get(sectionCode))
      .filter((section): section is SectionStats => Boolean(section)),
  }))

  function getSectionTileClass(sectionCode: string) {
    return selectedSectionCode === sectionCode ? 'section-tile active' : 'section-tile'
  }

  function renderMainSectionTile(section: SectionStats) {
    return (
      <button
        key={section.code}
        type="button"
        className={`${getSectionTileClass(section.code)} main-section-tile`}
        onClick={() => onSectionChange(section.code)}
        title={`${section.name}: ${section.owned}/${section.total}`}
        aria-label={`${section.name}: ${section.owned} de ${section.total}`}
      >
        <span className="team-code">{section.code}</span>
        <small className="section-count">
          {section.owned}/{section.total}
        </small>
      </button>
    )
  }

  function renderTeamSectionTile(section: SectionStats) {
    return (
      <button
        key={section.code}
        type="button"
        className={`${getSectionTileClass(section.code)} team-section-tile`}
        onClick={() => onSectionChange(section.code)}
        title={`${section.name}: ${section.owned}/${section.total}`}
        aria-label={`${section.name}: ${section.owned} de ${section.total}`}
      >
        <FlagIcon sectionCode={section.code} label={section.name} className="section-flag" />
        <span className="section-fraction" aria-hidden="true">
          <span>{section.owned}</span>
          <span>{section.total}</span>
        </span>
      </button>
    )
  }

  return (
    <section className="page-band">
      <div className="page-header album-page-header">
        <div className="album-heading">
          <p className="eyebrow">Catálogo</p>
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
              placeholder="Buscar por código, nome ou seleção"
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>

          <div className="filter-tabs" aria-label="Filtro de figurinhas">
            {albumFilterOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={stickerFilter === option.id ? 'active' : ''}
                onClick={() => onFilterChange(option.id)}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              className={showSpecialStickersOnly ? 'active' : ''}
              onClick={onSpecialFilterToggle}
              aria-pressed={showSpecialStickersOnly}
            >
              Especiais
            </button>
          </div>
        </div>
        <span className="meta-line">
          {visibleStickers.length} de {stickers.length} cromos exibidos
        </span>
      </section>

      <div className="album-layout">
        <aside className="section-sidebar" aria-label="Seções do álbum">
          <div className="section-group">
            <div className="section-group-grid main-section-grid">
              <button
                type="button"
                className={`${getSectionTileClass('all')} main-section-tile`}
                onClick={() => onSectionChange('all')}
                title={`Todas: ${ownedTotal}/${stickers.length}`}
                aria-label={`Todas as seções: ${ownedTotal} de ${stickers.length}`}
              >
                <span className="team-code">ALL</span>
                <small className="section-count">
                  {ownedTotal}/{stickers.length}
                </small>
              </button>

              {mainSections.map((section) => renderMainSectionTile(section))}
            </div>
          </div>

          {groupedSections.map((group) => (
            <div key={group.group} className="section-group grouped-section">
              <span className="section-group-title">{group.group}</span>
              <div className="section-group-grid">
                {group.sections.map((section) => renderTeamSectionTile(section))}
              </div>
            </div>
          ))}
        </aside>

        <section className="sticker-panel" aria-label="Figurinhas">
          <div className="sticker-grid">
            {visibleStickers.map((sticker) => {
              const quantity = inventoryByStickerId.get(sticker.id)?.quantity ?? 0
              const status = quantity > 1 ? 'Repetida' : quantity === 1 ? 'Tenho' : 'Faltante'
              const stateClass =
                quantity > 1 ? 'sticker-card repeated' : quantity === 1 ? 'sticker-card owned' : 'sticker-card'
              const sectionClass =
                sticker.sectionCode === 'PANINI' || sticker.sectionCode === 'FWC' ? ' compact-title-card' : ''

              return (
                <article key={sticker.id} className={`${stateClass}${sectionClass}`}>
                  <div className="sticker-card-header">
                    <span className="sticker-code">{sticker.displayCode}</span>
                    <span
                      className={
                        quantity > 1 ? 'status-pill repeated' : quantity > 0 ? 'status-pill owned' : 'status-pill'
                      }
                    >
                      {status}
                    </span>
                  </div>
                  <div className="sticker-card-title">
                    <strong>{sticker.title}</strong>
                    {sticker.isSpecial && <span className="special-pill">Foil</span>}
                  </div>
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
