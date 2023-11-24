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
 * Das Modul besteht aus der Klasse {@linkcode QueryBuilder}.
 * @packageDocumentation
 */
import { Cd } from '../entity/cd.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Lied } from '../entity/lied.entity.js';
import { Repository } from 'typeorm';
import { type Suchkriterien } from './cd-read.service.js';
import { Titel } from '../entity/titel.entity.js';
import { getLogger } from '../../logger/logger.js';
import { typeOrmModuleOptions } from '../../config/db.js';

/** Typdefinitionen für die Suche mit der Cd-ID. */
export interface BuildIdParams {
    /** ID des gesuchten Cds. */
    readonly id: number;
    /** Sollen die Lieder mitgeladen werden? */
    readonly mitLieder?: boolean;
}
/**
 * Die Klasse `QueryBuilder` implementiert das Lesen für CDs und greift
 * mit _TypeORM_ auf eine relationale DB zu.
 */
@Injectable()
export class QueryBuilder {
    readonly #cdAlias = `${Cd.name.charAt(0).toLowerCase()}${Cd.name.slice(1)}`;

    readonly #titelAlias = `${Titel.name
        .charAt(0)
        .toLowerCase()}${Titel.name.slice(1)}`;

    readonly #liedAlias = `${Lied.name
        .charAt(0)
        .toLowerCase()}${Lied.name.slice(1)}`;

    readonly #repo: Repository<Cd>;

    readonly #logger = getLogger(QueryBuilder.name);

    constructor(@InjectRepository(Cd) repo: Repository<Cd>) {
        this.#repo = repo;
    }

    /**
     * Ein Cd mit der ID suchen.
     * @param id ID des gesuchten Cdes
     * @returns QueryBuilder
     */
    buildId({ id, mitLieder = false }: BuildIdParams) {
        const queryBuilder = this.#repo.createQueryBuilder(this.#cdAlias);
        queryBuilder.innerJoinAndSelect(
            `${this.#cdAlias}.titel`,
            this.#titelAlias,
        );
        if (mitLieder) {
            queryBuilder.leftJoinAndSelect(
                `${this.#cdAlias}.lieder`,
                this.#liedAlias,
            );
        }
        queryBuilder.where(`${this.#cdAlias}.id = :id`, { id: id }); // eslint-disable-line object-shorthand
        return queryBuilder;
    }

    /**
     * CDs asynchron suchen.
     * @param suchkriterien JSON-Objekt mit Suchkriterien
     * @returns QueryBuilder
     */
    // z.B. { titel: 'a', bewertung: 5, javascript: true }
    // "rest properties" fuer anfaengliche WHERE-Klausel: ab ES 2018 https://github.com/tc39/proposal-object-rest-spread
    // eslint-disable-next-line max-lines-per-function
    build({ titel, javascript, typescript, ...props }: Suchkriterien) {
        this.#logger.debug(
            'build: titel=%s, javascript=%s, typescript=%s, props=%o',
            titel,
            javascript,
            typescript,
            props,
        );

        let queryBuilder = this.#repo.createQueryBuilder(this.#cdAlias);
        queryBuilder.innerJoinAndSelect(`${this.#cdAlias}.titel`, 'titel');

        // z.B. { titel: 'a', bewertung: 5, javascript: true }
        // "rest properties" fuer anfaengliche WHERE-Klausel: ab ES 2018 https://github.com/tc39/proposal-object-rest-spread
        // type-coverage:ignore-next-line
        // const { titel, javascript, typescript, ...props } = suchkriterien;

        let useWhere = true;

        // Titel in der Query: Teilstring des Titels und "case insensitive"
        // CAVEAT: MySQL hat keinen Vergleich mit "case insensitive"
        // type-coverage:ignore-next-line
        if (titel !== undefined && typeof titel === 'string') {
            const ilike =
                typeOrmModuleOptions.type === 'postgres' ? 'ilike' : 'like';
            queryBuilder = queryBuilder.where(
                `${this.#titelAlias}.titel ${ilike} :titel`,
                { titel: `%${titel}%` },
            );
            useWhere = false;
        }

        if (javascript === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#cdAlias}.schlagwoerter like '%JAVASCRIPT%'`,
                  )
                : queryBuilder.andWhere(
                      `${this.#cdAlias}.schlagwoerter like '%JAVASCRIPT%'`,
                  );
            useWhere = false;
        }

        if (typescript === 'true') {
            queryBuilder = useWhere
                ? queryBuilder.where(
                      `${this.#cdAlias}.schlagwoerter like '%TYPESCRIPT%'`,
                  )
                : queryBuilder.andWhere(
                      `${this.#cdAlias}.schlagwoerter like '%TYPESCRIPT%'`,
                  );
            useWhere = false;
        }

        // Restliche Properties als Key-Value-Paare: Vergleiche auf Gleichheit
        Object.keys(props).forEach((key) => {
            const param: Record<string, any> = {};
            param[key] = (props as Record<string, any>)[key]; // eslint-disable-line @typescript-eslint/no-unsafe-assignment, security/detect-object-injection
            queryBuilder = useWhere
                ? queryBuilder.where(`${this.#cdAlias}.${key} = :${key}`, param)
                : queryBuilder.andWhere(
                      `${this.#cdAlias}.${key} = :${key}`,
                      param,
                  );
            useWhere = false;
        });

        this.#logger.debug('build: sql=%s', queryBuilder.getSql());
        return queryBuilder;
    }
}
