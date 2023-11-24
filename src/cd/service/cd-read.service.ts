/*
 * Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Das Modul besteht aus der Klasse {@linkcode CdReadService}.
 * @packageDocumentation
 */

import { Cd, type CdGenre } from './../entity/cd.entity.js';
import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryBuilder } from './query-builder.js';
import RE2 from 're2';
import { getLogger } from '../../logger/logger.js';

/**
 * Typdefinition für `findById`
 */
export interface FindByIdParams {
    /** ID des gesuchten Cds */
    readonly id: number;
    /** Sollen die Lieder mitgeladen werden? */
    readonly mitLieder?: boolean;
}
export interface Suchkriterien {
    readonly isrc?: string;
    readonly bewertung?: number;
    readonly genre?: CdGenre;
    readonly preis?: number;
    readonly skonto?: number;
    readonly verfuegbar?: boolean;
    readonly erscheinungsdatum?: string;
    readonly interpret?: string;
    readonly javascript?: string;
    readonly typescript?: string;
    readonly titel?: string;
}

/**
 * Die Klasse `CdReadService` implementiert das Lesen für CDs und greift
 * mit _TypeORM_ auf eine relationale DB zu.
 */
@Injectable()
export class CdReadService {
    static readonly ID_PATTERN = new RE2('^[1-9][\\d]*$');

    readonly #cdProps: string[];

    readonly #queryBuilder: QueryBuilder;

    readonly #logger = getLogger(CdReadService.name);

    constructor(queryBuilder: QueryBuilder) {
        const cdDummy = new Cd();
        this.#cdProps = Object.getOwnPropertyNames(cdDummy);
        this.#queryBuilder = queryBuilder;
    }

    // Rueckgabetyp Promise bei asynchronen Funktionen
    //    ab ES2015
    //    vergleiche Task<> bei C# und Mono<> aus Project Reactor
    // Status eines Promise:
    //    Pending: das Resultat ist noch nicht vorhanden, weil die asynchrone
    //             Operation noch nicht abgeschlossen ist
    //    Fulfilled: die asynchrone Operation ist abgeschlossen und
    //               das Promise-Objekt hat einen Wert
    //    Rejected: die asynchrone Operation ist fehlgeschlagen and das
    //              Promise-Objekt wird nicht den Status "fulfilled" erreichen.
    //              Im Promise-Objekt ist dann die Fehlerursache enthalten.

    /**
     * Ein Cd asynchron anhand seiner ID suchen
     * @param id ID des gesuchten Cdes
     * @returns Das gefundene Cd vom Typ [Cd](cd_entity_cd_entity.Cd.html)
     *          in einem Promise aus ES2015.
     * @throws NotFoundException falls kein Cd mit der ID existiert
     */
    // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
    async findById({ id, mitLieder = false }: FindByIdParams) {
        this.#logger.debug('findById: id=%d', id);

        // https://typeorm.io/working-with-repository
        // Das Resultat ist undefined, falls kein Datensatz gefunden
        // Lesen: Keine Transaktion erforderlich
        const cd = await this.#queryBuilder.buildId({ id, mitLieder }).getOne();
        if (cd === null) {
            throw new NotFoundException(`Es gibt kein Cd mit der ID ${id}.`);
        }

        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug(
                'findById: cd=%s, titel=%o',
                cd.toString(),
                cd.titel,
            );
            if (mitLieder) {
                this.#logger.debug('findById: lieder=%o', cd.lieder);
            }
        }
        return cd;
    }

    /**
     * CDs asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien
     * @returns Ein JSON-Array mit den gefundenen CDsn.
     * @throws NotFoundException falls keine CDs gefunden wurden.
     */
    async find(suchkriterien?: Suchkriterien) {
        this.#logger.debug('find: suchkriterien=%o', suchkriterien);

        // Keine Suchkriterien?
        if (suchkriterien === undefined) {
            return this.#queryBuilder.build({}).getMany();
        }
        const keys = Object.keys(suchkriterien);
        if (keys.length === 0) {
            return this.#queryBuilder.build(suchkriterien).getMany();
        }

        // Falsche Namen fuer Suchkriterien?
        if (!this.#checkKeys(keys)) {
            throw new NotFoundException('Ungueltige Suchkriterien');
        }

        // QueryBuilder https://typeorm.io/select-query-builder
        // Das Resultat ist eine leere Liste, falls nichts gefunden
        // Lesen: Keine Transaktion erforderlich
        const cds = await this.#queryBuilder.build(suchkriterien).getMany();
        this.#logger.debug('find: cds=%o', cds);
        if (cds.length === 0) {
            throw new NotFoundException(
                `Keine Cds gefunden: ${JSON.stringify(suchkriterien)}`,
            );
        }

        return cds;
    }

    #checkKeys(keys: string[]) {
        // Ist jedes Suchkriterium auch eine Property von Cd oder "schlagwoerter"?
        let validKeys = true;
        keys.forEach((key) => {
            if (
                !this.#cdProps.includes(key) &&
                key !== 'javascript' &&
                key !== 'typescript'
            ) {
                this.#logger.debug(
                    '#find: ungueltiges Suchkriterium "%s"',
                    key,
                );
                validKeys = false;
            }
        });

        return validKeys;
    }
}
