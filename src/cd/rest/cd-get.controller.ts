/* eslint-disable max-lines */
/*
 * Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
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
 * Das Modul besteht aus der Controller-Klasse für Lesen an der REST-Schnittstelle.
 * @packageDocumentation
 */

// eslint-disable-next-line max-classes-per-file
import {
    ApiHeader,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiProperty,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { type Cd, type CdGenre } from '../entity/cd.entity.js';
import {
    CdReadService,
    type Suchkriterien,
} from '../service/cd-read.service.js';
import {
    Controller,
    Get,
    Headers,
    HttpStatus,
    Param,
    Query,
    Req,
    Res,
    UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ResponseTimeInterceptor } from '../../logger/response-time.interceptor.js';
import { type Titel } from '../entity/titel.entity.js';
import { getBaseUri } from './getBaseUri.js';
import { getLogger } from '../../logger/logger.js';
import { paths } from '../../config/paths.js';

/** href-Link für HATEOAS */
export interface Link {
    /** href-Link für HATEOAS-Links */
    readonly href: string;
}

/** Links für HATEOAS */
export interface Links {
    /** self-Link */
    readonly self: Link;
    /** Optionaler Linke für list */
    readonly list?: Link;
    /** Optionaler Linke für add */
    readonly add?: Link;
    /** Optionaler Linke für update */
    readonly update?: Link;
    /** Optionaler Linke für remove */
    readonly remove?: Link;
}

/** Typedefinition für ein Titel-Objekt ohne Rückwärtsverweis zum Cd */
export type TitelModel = Omit<Titel, 'cd' | 'id'>;

/** Cd-Objekt mit HATEOAS-Links */
export type CdModel = Omit<
    Cd,
    'lieder' | 'aktualisiert' | 'erzeugt' | 'id' | 'titel' | 'version'
> & {
    titel: TitelModel;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _links: Links;
};

/** Cd-Objekte mit HATEOAS-Links in einem JSON-Array. */
export interface CdsModel {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _embedded: {
        cds: CdModel[];
    };
}

/**
 * Klasse für `CdGetController`, um Queries in _OpenAPI_ bzw. Swagger zu
 * formulieren. `CdController` hat dieselben Properties wie die Basisklasse
 * `Cd` - allerdings mit dem Unterschied, dass diese Properties beim Ableiten
 * so überschrieben sind, dass sie auch nicht gesetzt bzw. undefined sein
 * dürfen, damit die Queries flexibel formuliert werden können. Deshalb ist auch
 * immer der zusätzliche Typ undefined erforderlich.
 * Außerdem muss noch `string` statt `Date` verwendet werden, weil es in OpenAPI
 * den Typ Date nicht gibt.
 */
export class CdQuery implements Suchkriterien {
    @ApiProperty({ required: false })
    declare readonly isrc: string;

    @ApiProperty({ required: false })
    declare readonly bewertung: number;

    @ApiProperty({ required: false })
    declare readonly genre: CdGenre;

    @ApiProperty({ required: false })
    declare readonly preis: number;

    @ApiProperty({ required: false })
    declare readonly skonto: number;

    @ApiProperty({ required: false })
    declare readonly verfuegbar: boolean;

    @ApiProperty({ required: false })
    declare readonly erscheinungsdatum: string;

    @ApiProperty({ required: false })
    declare readonly interpret: string;

    @ApiProperty({ required: false })
    declare readonly titel: string;
}

const APPLICATION_HAL_JSON = 'application/hal+json';

/**
 * Die Controller-Klasse für die Verwaltung von CDs.
 */
// Decorator in TypeScript, zur Standardisierung in ES vorgeschlagen (stage 3)
// https://devblogs.microsoft.com/typescript/announcing-typescript-5-0-beta/#decorators
// https://github.com/tc39/proposal-decorators
@Controller(paths.rest)
// @UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Cd REST-API')
// @ApiBearerAuth()
// Klassen ab ES 2015
export class CdGetController {
    // readonly in TypeScript, vgl. C#
    // private ab ES 2019
    readonly #service: CdReadService;

    readonly #logger = getLogger(CdGetController.name);

    // Dependency Injection (DI) bzw. Constructor Injection
    // constructor(private readonly service: CdReadService) {}
    // https://github.com/tc39/proposal-type-annotations#omitted-typescript-specific-features-that-generate-code
    constructor(service: CdReadService) {
        this.#service = service;
    }

    /**
     * Eine Cd wird asynchron anhand seiner ID als Pfadparameter gesucht.
     *
     * Falls es eine solche Cd gibt und `If-None-Match` im Request-Header
     * auf die aktuelle Version der Cd gesetzt war, wird der Statuscode
     * `304` (`Not Modified`) zurückgeliefert. Falls `If-None-Match` nicht
     * gesetzt ist oder eine veraltete Version enthält, wird das gefundene
     * Cd im Rumpf des Response als JSON-Datensatz mit Atom-Links für HATEOAS
     * und dem Statuscode `200` (`OK`) zurückgeliefert.
     *
     * Falls es kein Cd zur angegebenen ID gibt, wird der Statuscode `404`
     * (`Not Found`) zurückgeliefert.
     *
     * @param id Pfad-Parameter `id`
     * @param req Request-Objekt von Express mit Pfadparameter, Query-String,
     *            Request-Header und Request-Body.
     * @param version Versionsnummer im Request-Header bei `If-None-Match`
     * @param accept Content-Type bzw. MIME-Type
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    // eslint-disable-next-line max-params
    @Get(':id')
    @ApiOperation({ summary: 'Suche mit der Cd-ID' })
    @ApiParam({
        name: 'id',
        description: 'Z.B. 1',
    })
    @ApiHeader({
        name: 'If-None-Match',
        description: 'Header für bedingte GET-Requests, z.B. "0"',
        required: false,
    })
    @ApiOkResponse({ description: 'Die Cd wurde gefunden' })
    @ApiNotFoundResponse({ description: 'Keine Cd zur ID gefunden' })
    @ApiResponse({
        status: HttpStatus.NOT_MODIFIED,
        description: 'Die Cd wurde bereits heruntergeladen',
    })
    async getById(
        @Param('id') idStr: string,
        @Req() req: Request,
        @Headers('If-None-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response<CdModel | undefined>> {
        this.#logger.debug('getById: idStr=%s, version=%s"', idStr, version);
        const id = Number(idStr);
        if (Number.isNaN(id)) {
            this.#logger.debug('getById: NaN');
            return res.sendStatus(HttpStatus.NOT_FOUND);
        }

        if (req.accepts([APPLICATION_HAL_JSON, 'json', 'html']) === false) {
            this.#logger.debug('getById: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const cd = await this.#service.findById({ id });
        if (this.#logger.isLevelEnabled('debug')) {
            this.#logger.debug('getById(): cd=%s', cd.toString());
            this.#logger.debug('getById(): titel=%o', cd.titel);
        }

        // ETags
        const versionDb = cd.version;
        if (version === `"${versionDb}"`) {
            this.#logger.debug('getById: NOT_MODIFIED');
            return res.sendStatus(HttpStatus.NOT_MODIFIED);
        }
        this.#logger.debug('getById: versionDb=%s', versionDb);
        res.header('ETag', `"${versionDb}"`);

        // HATEOAS mit Atom Links und HAL (= Hypertext Application Language)
        const cdModel = this.#toModel(cd, req);
        this.#logger.debug('getById: cdModel=%o', cdModel);
        return res.contentType(APPLICATION_HAL_JSON).json(cdModel);
    }

    /**
     * CDs werden mit Query-Parametern asynchron gesucht. Falls es mindestens
     * eine solche Cd gibt, wird der Statuscode `200` (`OK`) gesetzt. Im Rumpf
     * des Response ist das JSON-Array mit den gefundenen CDs, die jeweils
     * um Atom-Links für HATEOAS ergänzt sind.
     *
     * Falls es kein Cd zu den Suchkriterien gibt, wird der Statuscode `404`
     * (`Not Found`) gesetzt.
     *
     * Falls es keine Query-Parameter gibt, werden alle CDs ermittelt.
     *
     * @param query Query-Parameter von Express.
     * @param req Request-Objekt von Express.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Get()
    @ApiOperation({ summary: 'Suche mit Suchkriterien' })
    @ApiOkResponse({ description: 'Eine evtl. leere Liste mit CDs' })
    async get(
        @Query() query: CdQuery,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response<CdsModel | undefined>> {
        this.#logger.debug('get: query=%o', query);

        if (req.accepts([APPLICATION_HAL_JSON, 'json', 'html']) === false) {
            this.#logger.debug('get: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const cds = await this.#service.find(query);
        this.#logger.debug('get: %o', cds);

        // HATEOAS: Atom Links je Cd
        const cdsModel = cds.map((cd) => this.#toModel(cd, req, false));
        this.#logger.debug('get: cdsModel=%o', cdsModel);

        const result: CdsModel = { _embedded: { cds: cdsModel } };
        return res.contentType(APPLICATION_HAL_JSON).json(result).send();
    }

    #toModel(cd: Cd, req: Request, all = true) {
        const baseUri = getBaseUri(req);
        this.#logger.debug('#toModel: baseUri=%s', baseUri);
        const { id } = cd;
        const links = all
            ? {
                  self: { href: `${baseUri}/${id}` },
                  list: { href: `${baseUri}` },
                  add: { href: `${baseUri}` },
                  update: { href: `${baseUri}/${id}` },
                  remove: { href: `${baseUri}/${id}` },
              }
            : { self: { href: `${baseUri}/${id}` } };

        this.#logger.debug('#toModel: cd=%o, links=%o', cd, links);
        const titelModel: TitelModel = {
            titel: cd.titel?.titel ?? 'N/A', // eslint-disable-line unicorn/consistent-destructuring
            untertitel: cd.titel?.untertitel ?? 'N/A', // eslint-disable-line unicorn/consistent-destructuring
        };
        /* eslint-disable unicorn/consistent-destructuring */
        const cdModel: CdModel = {
            isrc: cd.isrc,
            bewertung: cd.bewertung,
            genre: cd.genre,
            preis: cd.preis,
            skonto: cd.skonto,
            verfuegbar: cd.verfuegbar,
            erscheinungsdatum: cd.erscheinungsdatum,
            interpret: cd.interpret,
            titel: titelModel,
            _links: links,
        };
        /* eslint-enable unicorn/consistent-destructuring */

        return cdModel;
    }
}
/* eslint-enable max-lines */
