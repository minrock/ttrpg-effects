import { useEffect, useState, type JSX } from "react";
import { formatAbilityScore } from "../../../../domain/entity-library/entity-library";
import type { ScenePlayerCharacter } from "../../../../domain/sessions/scene-aside";
import { ModalBackdrop } from "./ModalBackdrop";
import { RichTextPreview } from "./RichTextPreview";

interface PlayerCharacterDetailModalProps {
  readonly character: ScenePlayerCharacter;
  readonly onClose: () => void;
  readonly onEdit?: () => void;
  readonly onAddToScene?: () => void;
  readonly onNotesChange?: (notes: string) => void;
}

export function PlayerCharacterDetailModal({
  character,
  onClose,
  onEdit,
  onAddToScene,
  onNotesChange
}: PlayerCharacterDetailModalProps): JSX.Element {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (character.imagePath === null) { setImageUrl(null); return; }
    void window.ttrpg?.resolveAsideUrl(character.imagePath).then((url) => setImageUrl(url ?? null));
  }, [character.imagePath]);

  return (
    <ModalBackdrop onClose={onClose} fitContent>
      <article className="player-character-card">
        <div className="player-character-card__name">
          <span>{character.playerName || "Jugador"}</span>
          <strong>{character.characterName}</strong>
        </div>

        <div className="player-character-card__portrait">
          {imageUrl !== null
            ? <img src={imageUrl} alt={character.characterName} />
            : <span>Sin imagen</span>}
        </div>

        <div className="player-character-card__summary">
          <InfoBox label="Nivel" value={character.level} />
          <InfoBox label="Especie" value={character.species} />
          <InfoBox label="Clase(s)" value={character.classes} />
          <InfoBox label="CA" value={character.armorClass} />
          <InfoBox label="PG" value={character.hitPoints} />
          <InfoBox label="Inic." value={character.initiative} />
          <InfoBox label="Percep." value={character.passivePerception} />
          <InfoBox label="CD" value={character.spellSaveDc} />
          <InfoBox label="Velocidad" value={character.speeds} />
        </div>

        <div className="player-character-card__abilities">
          <Ability label="Fue" value={character.stats.strength} />
          <Ability label="Con" value={character.stats.constitution} />
          <Ability label="Des" value={character.stats.dexterity} />
          <Ability label="Int" value={character.stats.intelligence} />
          <Ability label="Sab" value={character.stats.wisdom} />
          <Ability label="Car" value={character.stats.charisma} />
        </div>

        {character.notes.trim() !== "" ? (
          <div className="player-character-card__notes">
            <span>Notas</span>
            <RichTextPreview
              markdown={character.notes}
              mode={onNotesChange === undefined ? "readonly" : "dm-editable"}
              onChange={onNotesChange}
              contentClassName="player-character-card__notes-content"
            />
          </div>
        ) : null}

        <div className="player-character-card__actions">
          {onAddToScene !== undefined ? (
            <button type="button" onClick={onAddToScene}>Agregar a escena</button>
          ) : null}
          {onEdit !== undefined ? (
            <button type="button" onClick={onEdit}>Editar</button>
          ) : null}
          <button type="button" onClick={onClose}>Cerrar</button>
        </div>
      </article>
    </ModalBackdrop>
  );
}

function InfoBox({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="player-character-card__info">
      <span>{label}</span>
      <strong>{value.trim() === "" ? "-" : value}</strong>
    </div>
  );
}

function Ability({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <div className="player-character-card__ability">
      <span>{label}</span>
      <strong>{formatAbilityScore(value)}</strong>
    </div>
  );
}
