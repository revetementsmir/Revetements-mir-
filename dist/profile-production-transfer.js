(function (root) {
  'use strict';
  const KEY = 'mir:profile-production:pending-v1';
  // La politique est résolue lors du transfert, après le chargement des
  // scripts différés, afin d'utiliser la même règle sur le site et en Node.
  function stockPolicy() {
    const policy = typeof module === 'object' && module.exports
      ? require('./mir-bending-lengths.js')
      : root?.MIRBendingLengths;
    if (!policy?.check) throw new Error('Les longueurs de vente MIR sont indisponibles. Rechargez la page.');
    return policy;
  }
  function prepare(engine, snapshot, length, quantity) {
    const source = engine.restoreProfileOrder(snapshot);
    const exception = source.ruleExceptions?.[0];
    const checked = engine.finalizeProfileOrder(source.templateId, source.values, {
      ...source.options,
      exception: exception && { accepted: exception.accepted, acceptedBy: exception.acceptedBy, note: exception.note }
    });
    if (JSON.stringify(checked.geometry) !== JSON.stringify(source.geometry)) {
      throw new Error('La géométrie du snapshot a changé. Recréez la pièce dans Pliage.');
    }
    // Un transfert crée une nouvelle ligne de bon : ne pas considérer une
    // longueur historique non encore importée comme une exception de vente.
    const stock = stockPolicy().check({ profileId: source.templateId, lengthIn: length });
    if (!stock.ok) throw new Error(stock.message);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) {
      throw new Error('Indiquez une quantité entière de 1 à 999.');
    }
    const segments = [...checked.geometry.segments];
    const left = checked.geometry.extras?.find(segment => segment.id === 'leftHem');
    const right = checked.geometry.extras?.find(segment => segment.id === 'rightHem');
    if (left) segments.unshift({ ...left, headingDeg: left.headingDeg + 180 });
    if (right) segments.push(right);
    const fields = engine.PROFILE_TEMPLATES[source.templateId].fields;
    const bends = segments.slice(1).map((segment, i) => {
      const turn = ((segment.headingDeg - segments[i].headingDeg + 540) % 360) - 180;
      return turn === -180 ? { mode: 'hem', angle: 180, direction: 'right' } : { mode: 'signed', angle: turn };
    });
    const detail = exception ? 'Dérogation clouage J : ' + exception.currentIn + ' po, minimum ' + exception.minimumIn +
      ' po. Acceptée par ' + String(exception.acceptedBy).slice(0, 100) + '. ' + String(exception.note || '').slice(0, 220) : '';
    return {
      source,
      spec: {
        kind: 'profile', template: 'custom', name: engine.PROFILE_TEMPLATES[source.templateId].name,
        mirProfileId: source.templateId,
        unit: 'in', length, quantity, startAngle: segments[0].headingDeg,
        segments: segments.map((segment, i) => ({
          label: String.fromCharCode(65 + i), name: fields.find(field => field.id === segment.fieldId)?.label || segment.id,
          length: segment.length
        })),
        bends, coloredFace: { side: 'left', segmentId: 'A' }, note: detail
      }
    };
  }
  const api = { KEY, prepare };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIRProfileProductionTransfer = api;
})(typeof globalThis === 'object' ? globalThis : this);
